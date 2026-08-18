import type { Response } from "express";
import { supabase, uploadToSupabase } from "../utils/supabase.js";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        let { content, recipientId, receiverId, classId, attachmentUrl, attachmentType } = req.body;
        const senderId = req.user?.id;

        // Handle frontend field mismatch (recipientId vs receiverId)
        if (!recipientId && receiverId) {
            recipientId = receiverId;
        }

        if (!senderId) return res.status(401).json({ message: "Unauthorized" });

        // Enforce at least one target
        if (!recipientId && !classId) {
             return res.status(400).json({ message: "Message must have a recipient or class target" });
        }

        // Validate recipient if provided
        if (recipientId) {
            const recipient = await prisma.user.findUnique({
                where: { id: String(recipientId) }
            });
            if (!recipient) {
                return res.status(404).json({ message: "Recipient user not found" });
            }
        }

        // Validate class if provided
        if (classId) {
             const classObj = await prisma.class.findUnique({
                 where: { id: String(classId) }
             });
             if (!classObj) {
                 return res.status(404).json({ message: "Class not found" });
             }
        }

        const message = await prisma.message.create({
            data: {
                content,
                senderId,
                recipientId: recipientId ? String(recipientId) : null,
                classId: classId ? String(classId) : null,
                attachmentUrl,
                attachmentType
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        const io = req.app.get("io");

        if (io) {
            try {
                if (classId) {
                    const roomName = `class:${String(classId)}`;
                    io.to(roomName).emit("receive_message", message);
                } else if (recipientId) {
                    const receiverRoom = `user:${String(recipientId)}`;
                    const senderRoom = `user:${String(senderId)}`;

                    io.to(receiverRoom).emit("receive_message", message);
                    if (receiverRoom !== senderRoom) {
                        io.to(senderRoom).emit("receive_message", message);
                    }
                }
            } catch (socketError) {
                console.error("[Socket] Error emitting message from controller:", socketError);
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Error sending message" });
    }
};

export const uploadChatFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const publicUrl = await uploadToSupabase(req.file); // Use default bucket 'uploads' instead of 'materials'

        if (!publicUrl) {
            return res.status(500).json({ message: "Upload failed" });
        }

        res.json({ 
            url: publicUrl,
            type: req.file.mimetype.startsWith('image/') ? 'IMAGE' : 
                  req.file.mimetype === 'application/pdf' ? 'PDF' : 
                  req.file.mimetype.includes('video') ? 'VIDEO' : 'DOC',
            originalName: req.file.originalname
        });

    } catch (error) {
        console.error("Error uploading chat file", error);
        res.status(500).json({ message: "Server error during upload" });
    }
};

export const getClassHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.params;
        const messages = await prisma.message.findMany({
            where: { classId: String(classId) },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error });
    }
};

export const getPrivateHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params; // The other user
        const currentUserId = req.user?.id;
        
        if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, recipientId: String(userId) },
                    { senderId: String(userId), recipientId: currentUserId }
                ]
            },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error });
    }
};

export const getContacts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        let contacts: any[] = [];

        if ((role as string) === 'SUPER_ADMIN') {
            contacts = await prisma.user.findMany({
                where: { id: { not: userId } },
                select: { id: true, firstName: true, lastName: true, role: true, isOnline: true, avatarUrl: true, phone: true }
            });
        }
        else if ((role as string) === 'DIRECTEUR' || (role as string) === 'EDUCATEUR') {
            contacts = await prisma.user.findMany({
                where: { id: { not: userId }, schoolId: req.user?.schoolId },
                select: { id: true, firstName: true, lastName: true, role: true, isOnline: true, avatarUrl: true, phone: true }
            });
        }
        // If Teacher, get students in their classes AND other teachers
        else if ((role as string) === 'ENSEIGNANT' || (role as string) === 'TEACHER') {
             const teacherClasses = await prisma.teacherClass.findMany({
                 where: { teacherId: userId },
                 include: {
                     class: {
                         include: {
                             enrollments: {
                                 include: { 
                                     student: {
                                         select: { id: true, firstName: true, lastName: true, role: true, isOnline: true, avatarUrl: true, phone: true }
                                     } 
                                 }
                             }
                         }
                     }
                 }
             });
             
             const studentMap = new Map();
             teacherClasses.forEach(tc => {
                 if (tc.class && tc.class.enrollments) {
                    tc.class.enrollments.forEach(e => {
                        if (e.student && !studentMap.has(e.student.id)) {
                            studentMap.set(e.student.id, e.student);
                        }
                    });
                 }
             });

             // Aussi récupérer les autres enseignants et les directeurs de la même école
             const colleagues = await prisma.user.findMany({
                 where: {
                     role: { in: ['ENSEIGNANT', 'DIRECTEUR', 'EDUCATEUR'] },
                     id: { not: userId },
                     schoolId: req.user?.schoolId || undefined
                 },
                 select: { id: true, firstName: true, lastName: true, role: true, isOnline: true, avatarUrl: true, phone: true }
             });
             
             colleagues.forEach(c => studentMap.set(c.id, c));
             contacts = Array.from(studentMap.values());
        } 
        // If Student, get teachers of their courses
        else if ((role as string) === 'APPRENANT' || (role as string) === 'STUDENT') {
             const enrollments = await prisma.enrollment.findMany({
                 where: { studentId: userId },
                 include: {
                     class: {
                         include: {
                             teacherClasses: {
                                 include: { 
                                     teacher: {
                                         select: { id: true, firstName: true, lastName: true, role: true, isOnline: true, avatarUrl: true, phone: true }
                                     } 
                                 }
                             }
                         }
                     }
                 }
             });
             
             const teacherMap = new Map();
             enrollments.forEach(e => {
                 if (e.class && e.class.teacherClasses) {
                    e.class.teacherClasses.forEach(tc => {
                        if (tc.teacher && !teacherMap.has(tc.teacher.id)) {
                            teacherMap.set(tc.teacher.id, tc.teacher);
                        }
                    });
                 }
             });
             contacts = Array.from(teacherMap.values());
        }
        
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching contacts", error });
    }
}

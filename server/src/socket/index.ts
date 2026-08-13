import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

interface AuthSocket extends Socket {
  user?: any;
}

export const setupSocket = (io: Server) => {
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, (process.env.JWT_SECRET || "secret") as string);
      socket.user = decoded;
      
      // Update online status
      await prisma.user.update({
          where: { id: (decoded as any).id },
          data: { isOnline: true }
      });
      
      // Broadcast online status
      io.emit("user_status_update", { userId: (decoded as any).id, isOnline: true });

      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: AuthSocket) => {
    const userId = socket.user.id;
    const role = socket.user.role;
    console.log(`User connected: ${userId} (${role})`);

    // Join user's own room for private messages
    const userRoom = `user:${userId}`;
    await socket.join(userRoom);
    console.log(`[Socket] User ${userId} joined room ${userRoom}`);

    // Automatically join all class rooms the user belongs to
    try {
        if (role === 'ENSEIGNANT' || role === 'TEACHER') {
            const classes = await prisma.teacherClass.findMany({
                where: { teacherId: userId },
                select: { classId: true }
            });
            console.log(`[Socket] Teacher ${userId} found in ${classes.length} classes`);
            for (const c of classes) {
                const classRoom = `class:${c.classId}`;
                await socket.join(classRoom);
                console.log(`[Socket] Teacher ${userId} joined class room ${classRoom}`);
            }
        } else if (role === 'APPRENANT' || role === 'STUDENT') {
            const enrollments = await prisma.enrollment.findMany({
                where: { studentId: userId },
                select: { classId: true }
            });
            console.log(`[Socket] Student ${userId} found in ${enrollments.length} enrollments`);
            for (const e of enrollments) {
                const classRoom = `class:${e.classId}`;
                await socket.join(classRoom);
                console.log(`[Socket] Student ${userId} joined class room ${classRoom}`);
            }
        }
    } catch (error) {
        console.error("[Socket] Error joining rooms on connection", error);
    }

    socket.on("join_class", async (classId: string) => {
        const classRoom = `class:${classId}`;
        await socket.join(classRoom);
        console.log(`[Socket] User ${userId} manually joined class ${classRoom}`);
    });

    socket.on("send_message", async (data) => {
        try {
            const senderId = String(userId);
            const targetClassId = data.classId ? String(data.classId) : null;
            const targetRecipientId = data.recipientId ? String(data.recipientId) : null;
            
            console.log(`[Socket] Incoming message from ${senderId} to ${targetClassId ? 'class:'+targetClassId : 'user:'+targetRecipientId}`);

            if (!targetClassId && !targetRecipientId) {
                console.log("[Socket] Error: No target specified");
                return;
            }

            const message = await prisma.message.create({
                data: {
                    content: data.content || "",
                    senderId: senderId,
                    recipientId: targetClassId ? null : targetRecipientId,
                    classId: targetClassId,
                    attachmentUrl: data.attachmentUrl || null,
                    attachmentType: data.attachmentType || null
                },
                include: {
                    sender: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            if (targetClassId) {
                const roomName = `class:${targetClassId}`;
                const clients = await io.in(roomName).fetchSockets();
                console.log(`[Socket] Emitting to class ${roomName} (${clients.length} connected)`);
                io.to(roomName).emit("receive_message", message);
            } else if (targetRecipientId) {
                const receiverRoom = `user:${targetRecipientId}`;
                const senderRoom = `user:${senderId}`;
                
                const receiverClients = await io.in(receiverRoom).fetchSockets();
                const senderClients = await io.in(senderRoom).fetchSockets();
                
                console.log(`[Socket] Private message: ${senderRoom} (${senderClients.length}) -> ${receiverRoom} (${receiverClients.length})`);
                
                io.to(receiverRoom).emit("receive_message", message);
                if (receiverRoom !== senderRoom) {
                    io.to(senderRoom).emit("receive_message", message);
                }
            }
        } catch (e) {
            console.error("[Socket] Error in send_message:", e);
        }
    });

    socket.on("disconnect", async () => {
       console.log(`User disconnected: ${userId}`);
       try {
           await prisma.user.update({
               where: { id: userId },
               data: { isOnline: false }
           });
           io.emit("user_status_update", { userId, isOnline: false });
       } catch(e) { console.error(e); }
    });
  });
};

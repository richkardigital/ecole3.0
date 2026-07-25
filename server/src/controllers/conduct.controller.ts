import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";

const createConductSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  appreciation: z.string().optional(),
  comment: z.string().optional(),
});

export const createConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, termId, appreciation, comment } = createConductSchema.parse(req.body);
    const user = req.user;

    // RBAC: Ensure admin can only create for their school
    if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR' || (user?.role as string) === 'EDUCATEUR') {
        const student = await prisma.user.findFirst({
            where: { id: studentId, schoolId: user.schoolId }
        });
        if (!student) {
            return res.status(403).json({ message: "Student not found in your school" });
        }
    }

    const conduct = await prisma.conduct.create({
      data: {
        studentId,
        termId,
        appreciation,
        comment,
      },
    });

    res.status(201).json(conduct);
  } catch (error) {
    console.error("Error creating conduct:", error);
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const getConducts = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, termId } = req.query;
    const user = req.user;

    const where: any = {};

    // If student, can only see own conducts
    if ((user?.role as string) === 'APPRENANT') {
        where.studentId = user.id;
    } else if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR' || (user?.role as string) === 'EDUCATEUR') {
        // Only see students in their school
        where.student = {
            schoolId: user.schoolId
        };
        
        if (studentId) where.studentId = String(studentId);
        if (classId) {
            where.student.enrollments = {
                some: {
                    classId: String(classId)
                }
            };
        }
    } else {
        if (studentId) where.studentId = String(studentId);
        if (classId) {
            where.student = {
                enrollments: {
                    some: {
                        classId: String(classId)
                    }
                }
            };
        }
    }
    
    if (termId) where.termId = String(termId);

    const conducts = await prisma.conduct.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        term: {
            select: {
                id: true,
                name: true
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(conducts);
  } catch (error) {
    console.error("Error fetching conducts:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateConduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { appreciation, comment } = req.body;

        const conduct = await prisma.conduct.update({
            where: { id: id as string },
            data: { appreciation, comment }
        });

        res.json(conduct);
    } catch (error) {
        console.error("Error updating conduct:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const deleteConduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.conduct.delete({ where: { id: id as string } });
        res.json({ message: "Conduct deleted" });
    } catch (error) {
        console.error("Error deleting conduct:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

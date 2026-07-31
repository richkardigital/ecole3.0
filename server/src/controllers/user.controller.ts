import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string(),
  lastName: z.string(),
  matricule: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "DIRECTEUR", "ENSEIGNANT", "APPRENANT", "EDUCATEUR"]),
  schoolId: z.string().optional(),
});

import { sendEmail } from "../utils/mailer.js";

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, schoolId, matricule } = createUserSchema.parse(req.body);
    const currentUser = req.user;
    const file = req.file;

    // RBAC for creation
    if ((currentUser?.role as string) === 'EDUCATEUR') {
        if (role !== 'ENSEIGNANT' && role !== 'APPRENANT') {
            return res.status(403).json({ message: "IT Admin can only create Teachers and Students." });
        }
        // Force schoolId to be same as IT Admin
        if (currentUser.schoolId && schoolId && schoolId !== currentUser.schoolId) {
             return res.status(403).json({ message: "Cannot create user for another school." });
        }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (matricule) {
      const existingMatricule = await prisma.user.findUnique({ where: { matricule } });
      if (existingMatricule) {
        return res.status(400).json({ message: "Ce matricule est déjà utilisé" });
      }
    }

    const finalPassword = password || "Ecole2026!";
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // If IT_ADMIN or SCHOOL_ADMIN, ensure created user is in their school
    const targetSchoolId = ((currentUser?.role as string) === 'DIRECTEUR' || (currentUser?.role as string) === 'EDUCATEUR') 
        ? currentUser.schoolId 
        : (schoolId || null);

    let avatarUrl = null;
    if (file) {
       // Import uploadToSupabase dynamically or make sure it's imported at top
       const { uploadToSupabase } = await import("../utils/supabase.js");
       avatarUrl = await uploadToSupabase(file, 'avatars');
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        matricule,
        avatarUrl,
        role,
        schoolId: targetSchoolId,
      },
    });

    res.status(201).json({ id: user.id, email: user.email, role: user.role });

    // Send email asynchronously
    const loginUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Bienvenue sur Ecole Connectée !</h2>
        <p>Bonjour ${firstName} ${lastName},</p>
        <p>Votre compte a été créé avec succès sur la plateforme Ecole Connectée. Vous pouvez dès à présent vous connecter en utilisant les identifiants suivants :</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Email :</strong> ${email}</p>
          <p style="margin: 5px 0 0 0;"><strong>Mot de passe :</strong> ${finalPassword}</p>
        </div>
        <p style="color: #d9534f; font-weight: bold;">⚠️ IMPORTANT : Nous vous demandons de modifier votre mot de passe dès votre première connexion pour des raisons de sécurité.</p>
        <p>Cliquez sur le lien ci-dessous pour accéder à la plateforme :</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Se connecter</a>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">Ceci est un email automatique, merci de ne pas y répondre.</p>
      </div>
    `;
    sendEmail(email, "Vos identifiants Ecole Connectée", emailHtml).catch(err => console.error("Email send failed in background:", err));

  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, schoolId } = req.query;
    const currentUser = req.user;

    const whereClause: any = {};

    // Filter by role if provided
    if (role) whereClause.role = role;
    // Filter by schoolId if provided
    if (schoolId) whereClause.schoolId = schoolId;

    // RBAC: Strict filtering based on current user role
    if ((currentUser?.role as string) === 'DIRECTEUR' || (currentUser?.role as string) === 'EDUCATEUR') {
        // School Admin and IT Admin can ONLY see users from their own school
        if (!currentUser.schoolId) {
            return res.status(400).json({ message: "Admin has no school assigned" });
        }
        whereClause.schoolId = currentUser.schoolId;
        
        // Exclude SUPER_ADMIN
        whereClause.role = { not: 'SUPER_ADMIN' };
    } else if ((currentUser?.role as string) === 'SUPER_ADMIN') {
        // Super Admin can see everyone
        // If schoolId query param is provided, it's already in whereClause
    } else if ((currentUser?.role as string) === 'ENSEIGNANT') {
        if (!currentUser.schoolId) {
            return res.status(400).json({ message: "No school assigned" });
        }
        whereClause.schoolId = currentUser.schoolId;
        
        // Teachers can see their own students (or other users if we want to be permissive, but strictly they see their students)
        // For simplicity and avoiding complex nested queries that might fail if no students exist,
        // let's just let them see APPRENANT in their school, or only themselves.
        // The prompt says "les notes de ses élèves". It doesn't strictly say they can't see the directory of the school.
        // Let's restrict to APPRENANTs in their classes, and maybe themselves.
        whereClause.OR = [
            { id: currentUser.id },
            {
                role: 'APPRENANT',
                enrollments: {
                    some: {
                        class: {
                            courses: {
                                some: { teacherId: currentUser.id }
                            }
                        }
                    }
                }
            }
        ];
    } else if ((currentUser?.role as string) === 'APPRENANT') {
        whereClause.id = currentUser.id;
    } else {
        return res.status(403).json({ message: "Access denied" });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            name: true,
          }
        },
        enrollments: {
            include: {
                class: true
            }
        },
        courses: {
            include: {
                class: true,
                subject: true
            }
        },
        teacherClasses: {
            include: {
                class: true,
                subject: true
            }
        }
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, schoolId, password, matricule } = req.body; // Allow partial updates without password
    const file = req.file;
    const currentUser = req.user;

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "Missing id" });

    const targetUser = await prisma.user.findUnique({ where: { id: String(id) } });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // RBAC Security Checks
    if ((currentUser.role as string) === 'EDUCATEUR') {
        // Can only edit TEACHER, STUDENT, or SELF
        if (targetUser.role !== 'ENSEIGNANT' && targetUser.role !== 'APPRENANT' && targetUser.id !== currentUser.id) {
             return res.status(403).json({ message: "L'informaticien ne peut modifier que les enseignants, les élèves ou son propre profil." });
        }
        
        // Cannot change role to/from ADMINs
        if (role) {
             if ((role as string) === 'SUPER_ADMIN' || (role as string) === 'DIRECTEUR') {
                 return res.status(403).json({ message: "Action non autorisée sur les rôles administrateurs." });
             }
             if (targetUser.id === currentUser.id && role !== 'EDUCATEUR') {
                  return res.status(403).json({ message: "Vous ne pouvez pas changer votre propre rôle." });
             }
        }
        
        // Cannot change schoolId to another school
        if (schoolId && schoolId !== currentUser.schoolId) {
             return res.status(403).json({ message: "Action non autorisée sur l'école." });
        }
    }

    // Check matricule uniqueness if changed
    if (matricule && matricule !== targetUser.matricule) {
      const existingMatricule = await prisma.user.findUnique({ where: { matricule } });
      if (existingMatricule) {
        return res.status(400).json({ message: "Ce matricule est déjà utilisé" });
      }
    }

    const updateData: any = {
        email,
        firstName,
        lastName,
        matricule,
        role,
        schoolId: schoolId || undefined,
    };

    if (file) {
       const { uploadToSupabase } = await import("../utils/supabase.js");
       updateData.avatarUrl = await uploadToSupabase(file, 'avatars');
    }

    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: updateData,
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "Missing id" });

    // 1. Prevent self-deletion
    if (currentUser.id === id) {
        return res.status(403).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: String(id) } });
    if (!targetUser) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // 2. RBAC Specific Logic
    if ((currentUser.role as string) === 'EDUCATEUR') {
        // IT_ADMIN can only delete TEACHER and STUDENT
        if (targetUser.role !== 'ENSEIGNANT' && targetUser.role !== 'APPRENANT') {
            return res.status(403).json({ message: "L'informaticien ne peut supprimer que des enseignants et des élèves." });
        }
        // Must be in same school
        if (targetUser.schoolId !== currentUser.schoolId) {
             return res.status(403).json({ message: "Impossible de supprimer un utilisateur d'une autre école." });
        }
    } 
    
    if ((currentUser.role as string) === 'DIRECTEUR') {
         // SCHOOL_ADMIN cannot delete SUPER_ADMIN
         if ((targetUser.role as string) === 'SUPER_ADMIN') {
             return res.status(403).json({ message: "Impossible de supprimer le Super Admin." });
         }
         // Ensure same school (unless target is SUPER_ADMIN which is already handled, or unassigned)
         if (targetUser.schoolId && targetUser.schoolId !== currentUser.schoolId) {
             return res.status(403).json({ message: "Impossible de supprimer un utilisateur d'une autre école." });
         }
    }

    await prisma.user.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!id || !password) return res.status(400).json({ message: "Missing id or password" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: String(id) },
            data: { password: hashedPassword }
        });

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error updating password", error });
    }
};

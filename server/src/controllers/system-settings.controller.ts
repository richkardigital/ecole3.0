import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const updateSystemSettingsSchema = z.object({
  platformName: z.string().min(2).optional(),
  logoUrl: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  stampUrl: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalAddress: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    let settings = await (prisma as any).systemSetting.findFirst({
      where: { id: "default" }
    });

    if (!settings) {
      settings = await (prisma as any).systemSetting.create({
        data: {
          id: "default",
          platformName: "École 3.0 / SEEEC Platform",
          email: "support@ecole3-seeec.ci",
          phone: "+225 07 00 00 00 00",
          address: "Plateau, Abidjan, Côte d'Ivoire",
          postalAddress: "01 BP 1234 Abidjan 01",
          websiteUrl: "https://ecole3-seeec.ci",
          description: "Plateforme Numérique Intelligente de Gestion Scolaire et d'Éducation Connectée.",
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des paramètres système", error });
  }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = updateSystemSettingsSchema.parse(req.body);

    const updateData: any = {};
    if (validatedData.platformName !== undefined) updateData.platformName = validatedData.platformName;
    if (validatedData.logoUrl !== undefined) updateData.logoUrl = validatedData.logoUrl;
    if (validatedData.signatureUrl !== undefined) updateData.signatureUrl = validatedData.signatureUrl;
    if (validatedData.stampUrl !== undefined) updateData.stampUrl = validatedData.stampUrl;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.postalAddress !== undefined) updateData.postalAddress = validatedData.postalAddress;
    if (validatedData.websiteUrl !== undefined) updateData.websiteUrl = validatedData.websiteUrl;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;

    const settings = await (prisma as any).systemSetting.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        platformName: validatedData.platformName || "École 3.0 / SEEEC Platform",
        ...updateData
      }
    });

    res.json(settings);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Erreur de validation", errors: error.issues });
    }
    console.error("Error updating system settings:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour des paramètres système", error });
  }
};

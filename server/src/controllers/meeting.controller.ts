import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { createMeetingSchema, updateMeetingSchema } from "../validations/meeting.validation.js";
import { MeetingService } from "../services/meeting.service.js";

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const data = createMeetingSchema.parse(req.body);
    const meeting = await MeetingService.create(data, req.user!.id);
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const filters: any = {};
    
    if (user.role === 'APPRENANT') {
        filters.class = {
            enrollments: { some: { studentId: user.id } }
        };
    } else if (user.role === 'ENSEIGNANT') {
        filters.hostId = user.id;
    } else {
        // Directeurs, Super Admins peuvent voir tout de leur ecole
        if (user.schoolId) {
            filters.host = { schoolId: user.schoolId };
        }
    }

    const meetings = await MeetingService.findAll(filters);
    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMeetingSchema.parse(req.body);
    const meeting = await MeetingService.update(String(req.params.id), data);
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    await MeetingService.delete(String(req.params.id));
    res.json({ message: "Meeting deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

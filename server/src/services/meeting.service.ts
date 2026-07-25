import prisma from "../utils/prisma.js";

export const MeetingService = {
  async create(data: any, hostId: string) {
    return prisma.meeting.create({
      data: {
        ...data,
        hostId,
      },
    });
  },

  async findAll(filters: any) {
    return prisma.meeting.findMany({
      where: filters,
      include: { host: { select: { id: true, firstName: true, lastName: true } }, class: true },
      orderBy: { startTime: 'asc' }
    });
  },

  async findById(id: string) {
    return prisma.meeting.findUnique({
      where: { id },
      include: { host: true, class: true },
    });
  },

  async update(id: string, data: any) {
    return prisma.meeting.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.meeting.delete({
      where: { id },
    });
  }
};

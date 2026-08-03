import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const classId = "9c85dfe5-e228-452f-9245-f4a762c9273c"; // 4ème B
    const teacherId = "50b56388-6f2d-46ae-93e9-2c42550d7647"; // teacher
    const termId = "some-term-id";

    let course = await prisma.course.findFirst({
        where: { classId: String(classId), teacherId: teacherId },
        include: { subject: true }
    });
    console.log("Course:", course ? course.id : null);

    if (course) {
        const enrollments = await prisma.enrollment.findMany({
            where: { classId: String(classId) },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, matricule: true }
                }
            },
            orderBy: { student: { lastName: 'asc' } }
        });
        const students = enrollments.map(e => e.student);
        console.log("Students length:", students.length);
        console.log("Students:", students);
    }
}
main().finally(() => prisma.$disconnect());

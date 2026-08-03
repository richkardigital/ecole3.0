import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const course = await prisma.course.findUnique({
        where: { id: "c246ec53-9914-4710-af4a-4a9764a4411c" },
        include: { class: true, teacher: true }
    });
    console.log("Course:", JSON.stringify(course, null, 2));
}
main().finally(() => prisma.$disconnect());

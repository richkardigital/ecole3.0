import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const allowedNiveauIds = [ 'bf713a4f-9741-470e-ac67-9f89ea2c3e2a' ];

  const where: any = {
    class: {
      academicYear: {
        isCurrent: true
      }
    }
  };

  where.class.niveauId = { in: allowedNiveauIds };

  try {
    const courses = await prisma.course.findMany({
      where,
      include: {
        class: {
          include: {
            school: { select: { id: true, name: true, code: true, logoUrl: true } },
            niveau: { select: { id: true, nom: true } }
          }
        },
        subject: { select: { id: true, name: true, color: true } },
        teacher: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { chapters: true, resources: true } }
      },
      orderBy: [
        { subject: { name: "asc" } },
        { class: { name: "asc" } }
      ]
    });
    console.log(courses.length);
  } catch (err: any) {
    console.error(err.message);
  }
}

test();

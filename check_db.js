const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.question.groupBy({
    by: ['technologyId'],
    _count: {
      id: true,
    },
  });
  
  const techs = await prisma.technology.findMany();
  
  console.log("Counts:");
  for (const count of counts) {
    const tech = techs.find(t => t.id === count.technologyId);
    console.log(`- ${tech?.name || count.technologyId}: ${count._count.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

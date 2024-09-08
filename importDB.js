const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.file.delete({
    where: { id: 16 },
  });

  const file = await prisma.file.create({
    data: {
      title: 'Earth Ozone Statistics 2024 V4',
      metadataHash:
        'd9551ac5f9a58e69f64dc98bfb3132233b568c583752b99863bef4539222682f',
      contentHash:
        '893d72ca3d02b55007b1efb9db2f6f399c3704499ba8577db8e7a8bd4c77b500',
    },
  });
  console.log(file);
}

main()
  .catch((e) => {
    console.error(e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

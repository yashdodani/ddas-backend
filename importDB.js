const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const file = await prisma.file.create({
    data: {
      title: 'Earth Ozone Statistics 2024 V3',
      metadataHash:
        'e939bdb8db7d7e9f190206d3788334b0688af54be3e429a268ae50d2ad5842db',
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

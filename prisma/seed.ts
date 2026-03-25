import { PrismaClient, RoleMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaults = [
    {
      slug: 'default-reflective-guide',
      name: '冷静的反思镜',
      roleMode: RoleMode.Reflective_Guide,
    },
    {
      slug: 'default-gentle-companion',
      name: '温暖的树洞',
      roleMode: RoleMode.Gentle_Companion,
    },
    {
      slug: 'default-custom-character',
      name: '你的专属伙伴',
      roleMode: RoleMode.Custom_Character,
    },
  ];

  for (const character of defaults) {
    await prisma.character.upsert({
      where: { slug: character.slug },
      update: {
        name: character.name,
        roleMode: character.roleMode,
        isDefault: true,
      },
      create: {
        slug: character.slug,
        name: character.name,
        roleMode: character.roleMode,
        isDefault: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

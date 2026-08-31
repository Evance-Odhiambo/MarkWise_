/**
 * Seed sample units for testing
 * Run with: npx tsx src/scripts/seed-sample-units.ts
 */

import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting sample units seeding...");

  const institutions = await prisma.institution.findMany({
    select: { id: true, name: true },
  });

  if (institutions.length === 0) {
    console.error("No institutions found. Please create an institution first.");
    return;
  }

  console.log(`Found ${institutions.length} institution(s)`);

  for (const institution of institutions) {
    console.log(`\nProcessing institution: ${institution.name}`);

    let course = await prisma.course.findFirst({
      where: { institutionId: institution.id },
    });

    if (!course) {
      console.log("  Creating sample course...");
      course = await prisma.course.create({
        data: {
          name: "Bachelor of Science in Computer Science",
          institutionId: institution.id,
        },
      });
    }

    let courseYear = await prisma.courseYear.findFirst({
      where: { courseId: course.id },
    });

    if (!courseYear) {
      console.log("  Creating course year...");
      courseYear = await prisma.courseYear.create({
        data: {
          yearNumber: 1,
          courseId: course.id,
        },
      });
    }

    let semester = await prisma.semester.findFirst({
      where: { courseYearId: courseYear.id },
    });

    if (!semester) {
      console.log("  Creating semester...");
      semester = await prisma.semester.create({
        data: {
          name: "Semester 1",
          semesterNumber: 1,
          courseYearId: courseYear.id,
        },
      });
    }

    const sampleUnits = [
      { code: "CSC101", name: "Introduction to Computer Science", bleId: "1001" },
      { code: "MAT101", name: "Calculus I", bleId: "1002" },
      { code: "PHY101", name: "Physics I", bleId: "1003" },
      { code: "ENG101", name: "Technical Writing", bleId: "1004" },
      { code: "CSC201", name: "Data Structures", bleId: "1005" },
    ];

    for (const unitData of sampleUnits) {
      const existing = await prisma.unit.findFirst({
        where: {
          code: unitData.code,
          semesterId: semester.id,
        },
      });

      if (!existing) {
        await prisma.unit.create({
          data: {
            code: unitData.code,
            name: unitData.name,
            bleId: unitData.bleId,
            semesterId: semester.id,
          },
        });
        console.log(`  ✓ Created unit: ${unitData.code} - ${unitData.name}`);
      } else {
        console.log(`  - Unit already exists: ${unitData.code}`);
      }

      await prisma.bleMapping.upsert({
        where: {
          institutionId_unitCode: {
            institutionId: institution.id,
            unitCode: unitData.code,
          },
        },
        update: {
          unitName: unitData.name,
          bleId: unitData.bleId,
        },
        create: {
          institutionId: institution.id,
          unitCode: unitData.code,
          unitName: unitData.name,
          bleId: unitData.bleId,
        },
      });
    }

    console.log(`  ✓ Completed ${institution.name}`);
  }

  console.log("\n✅ Seeding completed!");
}

main()
  .catch((error) => {
    console.error("Error seeding units:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

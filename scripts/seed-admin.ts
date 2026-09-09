import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@saasgrowth.internal'
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!'

  console.log(`[Seed] Initializing Admin user seeding for: ${adminEmail}...`)

  const hashedPassword = await hash(adminPassword, 12)

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  let adminUser
  if (existingAdmin) {
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'admin',
        isActive: true,
        passwordHash: hashedPassword,
      },
    })
    console.log(`[Seed] Updated existing account to Admin: ${adminUser.email}`)
  } else {
    adminUser = await prisma.user.create({
      data: {
        name: 'Administrator',
        email: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        authProvider: 'credentials',
      },
    })
    console.log(`[Seed] Created new Admin account: ${adminUser.email}`)
  }

  // Ensure default tenant exists for Admin
  const adminTenant = await prisma.tenant.upsert({
    where: { slug: 'admin-workspace' },
    update: {},
    create: {
      name: 'Admin Workspace',
      slug: 'admin-workspace',
      ownerId: adminUser.id,
      status: 'active',
      plan: 'enterprise',
    },
  })

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: adminTenant.id,
        userId: adminUser.id,
      },
    },
    update: { role: 'owner' },
    create: {
      tenantId: adminTenant.id,
      userId: adminUser.id,
      role: 'owner',
    },
  })

  // Seed a standard test user for role-boundary testing
  const standardEmail = 'user@saasgrowth.internal'
  const standardPassword = 'UserSecurePassword123!'
  const hashedStandardPassword = await hash(standardPassword, 12)

  const existingStandardUser = await prisma.user.findUnique({
    where: { email: standardEmail },
  })

  if (!existingStandardUser) {
    const stdUser = await prisma.user.create({
      data: {
        name: 'Standard User',
        email: standardEmail,
        passwordHash: hashedStandardPassword,
        role: 'user',
        isActive: true,
        authProvider: 'credentials',
      },
    })

    const stdTenant = await prisma.tenant.create({
      data: {
        name: 'Standard Workspace',
        slug: 'standard-workspace',
        ownerId: stdUser.id,
        status: 'active',
        plan: 'starter',
      },
    })

    await prisma.tenantUser.create({
      data: {
        tenantId: stdTenant.id,
        userId: stdUser.id,
        role: 'owner',
      },
    })

    console.log(`[Seed] Created standard test user: ${stdUser.email}`)
  } else {
    console.log(`[Seed] Standard test user already exists: ${standardEmail}`)
  }

  console.log('[Seed] Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

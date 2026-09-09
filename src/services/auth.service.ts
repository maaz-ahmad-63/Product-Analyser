import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'

export interface RegisterInput {
  name: string
  email: string
  password: string
  tenantName: string
}

export interface LoginInput {
  email: string
  password: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = slugify(baseName)
  let existing = await prisma.tenant.findUnique({ where: { slug } })
  let counter = 1
  while (existing) {
    slug = `${slugify(baseName)}-${counter}`
    existing = await prisma.tenant.findUnique({ where: { slug } })
    counter++
  }
  return slug
}

export const authService = {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new Error('A user with this email already exists')
    }

    const passwordHash = await hash(input.password, 12)
    const slug = await generateUniqueSlug(input.tenantName)

    // Create user, tenant, and tenant-user link in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          authProvider: 'credentials',
          role: 'user',
        },
      })

      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug,
          ownerId: user.id,
          status: 'active',
          plan: 'starter',
        },
      })

      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
        },
      })

      return { user, tenant }
    })

    return result
  },

  async validateCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenantUsers: {
          include: {
            tenant: true,
          },
        },
      },
    })

    if (!user || !user.passwordHash) {
      return null
    }

    if (user.isActive === false) {
      throw new Error('ACCOUNT_DEACTIVATED')
    }

    const isValid = await compare(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    // Record last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return user
  },

  async getUserTenants(userId: string) {
    return prisma.tenantUser.findMany({
      where: { userId },
      include: {
        tenant: true,
      },
    })
  },

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          include: { tenant: true },
        },
      },
    })
  },
}

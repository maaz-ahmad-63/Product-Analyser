import { prisma } from '@/lib/prisma'

export const tenantService = {
  async getTenantById(tenantId: string) {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            tenantUsers: true,
            saasProducts: true,
            competitors: true,
            sources: true,
          },
        },
      },
    })
  },

  async getTenantBySlug(slug: string) {
    return prisma.tenant.findUnique({
      where: { slug },
    })
  },

  async updateTenant(tenantId: string, data: { name?: string; settings?: object }) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data,
    })
  },

  async getTenantMembers(tenantId: string) {
    return prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    })
  },

  async addMember(tenantId: string, userId: string, role: string = 'member') {
    return prisma.tenantUser.create({
      data: { tenantId, userId, role },
    })
  },

  async removeMember(tenantId: string, userId: string) {
    return prisma.tenantUser.delete({
      where: { tenantId_userId: { tenantId, userId } },
    })
  },

  async verifyMembership(tenantId: string, userId: string) {
    const membership = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    })
    return membership
  },
}

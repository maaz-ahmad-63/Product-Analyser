import { type NextAuthOptions, type DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authService } from '@/services/auth.service'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      isActive: boolean
      tenants: Array<{
        id: string
        name: string
        slug: string
        role: string
      }>
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: string
    isActive: boolean
    tenants: Array<{
      id: string
      name: string
      slug: string
      role: string
    }>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    isActive: boolean
    tenants: Array<{
      id: string
      name: string
      slug: string
      role: string
    }>
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await authService.validateCredentials(
            credentials.email.trim().toLowerCase(),
            credentials.password
          )

          if (!user) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            tenants: user.tenantUsers.map((tu) => ({
              id: tu.tenant.id,
              name: tu.tenant.name,
              slug: tu.tenant.slug,
              role: tu.role,
            })),
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'ACCOUNT_DEACTIVATED') {
            throw new Error('ACCOUNT_DEACTIVATED')
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role
        token.isActive = user.isActive
        token.tenants = user.tenants
      } else if (token.id) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { tenantUsers: { include: { tenant: true } } },
          })
          if (!dbUser && token.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              include: { tenantUsers: { include: { tenant: true } } },
            })
          }
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.isActive = dbUser.isActive
            token.tenants = dbUser.tenantUsers.map((tu: any) => ({
              id: tu.tenant.id,
              name: tu.tenant.name,
              slug: tu.tenant.slug,
              role: tu.role,
            }))
          }
        } catch {
          // Gracefully continue with cached token
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.isActive = token.isActive
      session.user.tenants = token.tenants
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}

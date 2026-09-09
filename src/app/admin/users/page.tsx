'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  AlertTriangle,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Key,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  analysesCount: number;
  salesSnapshotsCount: number;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin role required');
        throw new Error(`Failed to load users (${res.status})`);
      }
      const json = await res.json();
      setUsers(json.users || []);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = !user.isActive;
    const confirmMessage = nextStatus
      ? `Activate user ${user.email}?`
      : `Deactivate user ${user.email}? They will be immediately blocked from logging in.`;

    if (!confirm(confirmMessage)) return;

    setUpdatingId(user.id);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setActionSuccess(`User ${user.email} status updated to ${nextStatus ? 'Active' : 'Deactivated'}.`);
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRole = async (user: UserRecord) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMessage = `Change role for ${user.email} to ${nextRole.toUpperCase()}?`;

    if (!confirm(confirmMessage)) return;

    setUpdatingId(user.id);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setActionSuccess(`Role for ${user.email} changed to ${nextRole.toUpperCase()}.`);
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage registered accounts, roles, access permissions, and activation status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by email, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border"
            />
          </div>
          <Button
            onClick={fetchUsers}
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Analyses</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-400" />
                    Loading registered users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentUser = session?.user?.id === u.id;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        !u.isActive ? 'bg-muted/10 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{u.name || u.email.split('@')[0]}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1 rounded border border-purple-500/20">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            u.role === 'admin'
                              ? 'border-purple-500/40 text-purple-400 bg-purple-500/10 uppercase text-[9px] font-mono'
                              : 'border-border text-muted-foreground uppercase text-[9px] font-mono'
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Analyses Count */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-foreground">{u.analysesCount}</span>
                      </td>

                      {/* Registered Date */}
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3" />
                          <span>
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Toggle Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isCurrentUser || isUpdating}
                            onClick={() => handleToggleRole(u)}
                            title={
                              isCurrentUser
                                ? 'Cannot modify your own role'
                                : `Switch to ${u.role === 'admin' ? 'user' : 'admin'}`
                            }
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Shield className="h-3 w-3 mr-1 text-purple-400" />
                            {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                          </Button>

                          {/* Status Toggle Button */}
                          {u.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCurrentUser || isUpdating}
                              onClick={() => handleToggleStatus(u)}
                              title={
                                isCurrentUser
                                  ? 'Cannot deactivate your own account'
                                  : 'Deactivate account'
                              }
                              className="h-7 text-[11px] px-2 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleToggleStatus(u)}
                              className="h-7 text-[11px] px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

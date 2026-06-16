import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { users } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import { AdminOrdersTable } from './orders-table'

export default async function AdminOrdersPage() {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalMmk: orders.totalMmk,
      placedAt: orders.placedAt,
      userEmail: users.email,
      userName: users.name,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .orderBy(desc(orders.placedAt))

  return (
    <div>
      <h2 className="font-display text-[26px]">Orders</h2>
      <p className="mt-2 text-[14px] text-muted">
        Change status as payments clear or shipments leave.
      </p>
      <AdminOrdersTable
        initial={rows.map((r) => ({
          id: r.id,
          status: r.status,
          totalMmk: Number(r.totalMmk),
          placedAt: r.placedAt.toISOString(),
          userEmail: r.userEmail,
          userName: r.userName,
        }))}
      />
    </div>
  )
}

# Wave 7: Notifications & Calendar System

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P2  
**Timeline**: Week 4  
**Dependencies**: Wave 6B complete  
**Can Run Parallel With**: Wave 8

---

## Overview

Complete the notifications system with real-time updates and calendar integration for appointments, tasks, and events.

---

## Task 1: Real-Time Notifications (3 hours)

### WebSocket Setup

```typescript
// server/websocket.ts

import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { verifyToken } from './auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

const clients = new Map<number, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    const { query } = parse(req.url || '', true);
    const token = query.token as string;

    try {
      const user = await verifyToken(token);
      ws.userId = user.id;
      ws.isAlive = true;

      // Add to clients map
      if (!clients.has(user.id)) {
        clients.set(user.id, new Set());
      }
      clients.get(user.id)!.add(ws);

      console.log(`[WS] User ${user.id} connected`);

      // Send unread count on connect
      const unreadCount = await getUnreadNotificationCount(user.id);
      ws.send(JSON.stringify({ type: 'unread_count', count: unreadCount }));

    } catch (error) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error('[WS] Message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        clients.get(ws.userId)?.delete(ws);
        console.log(`[WS] User ${ws.userId} disconnected`);
      }
    });
  });

  // Heartbeat to detect dead connections
  setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}

async function handleMessage(ws: AuthenticatedWebSocket, message: any) {
  switch (message.type) {
    case 'mark_read':
      await markNotificationRead(message.notificationId, ws.userId!);
      break;
    case 'mark_all_read':
      await markAllNotificationsRead(ws.userId!);
      sendToUser(ws.userId!, { type: 'unread_count', count: 0 });
      break;
  }
}

export function sendToUser(userId: number, data: any) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const message = JSON.stringify(data);
  userClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastToAll(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(userClients => {
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
}
```

### Notification Service Update

```typescript
// server/services/notificationService.ts

import { sendToUser } from '../websocket';

export async function createAndSendNotification(options: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}) {
  // Create in database
  const [notification] = await db.insert(notifications)
    .values({
      ...options,
      read: false,
      createdAt: new Date(),
    })
    .returning();

  // Send real-time notification
  sendToUser(options.userId, {
    type: 'notification',
    notification: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    },
  });

  // Update unread count
  const unreadCount = await getUnreadNotificationCount(options.userId);
  sendToUser(options.userId, { type: 'unread_count', count: unreadCount });

  // Check preferences and send external notifications
  await sendExternalNotifications(options.userId, notification);

  return notification;
}

// Notification types and their handlers
export const notificationTypes = {
  order_created: {
    getTitle: (data: any) => `New Order #${data.orderId}`,
    getMessage: (data: any) => `${data.clientName} placed an order for ${formatCurrency(data.total)}`,
    getLink: (data: any) => `/orders/${data.orderId}`,
  },
  order_shipped: {
    getTitle: (data: any) => `Order #${data.orderId} Shipped`,
    getMessage: (data: any) => `Order for ${data.clientName} has been shipped`,
    getLink: (data: any) => `/orders/${data.orderId}`,
  },
  payment_received: {
    getTitle: (data: any) => `Payment Received`,
    getMessage: (data: any) => `${data.clientName} paid ${formatCurrency(data.amount)} on invoice #${data.invoiceNumber}`,
    getLink: (data: any) => `/invoices/${data.invoiceId}`,
  },
  invoice_overdue: {
    getTitle: (data: any) => `Invoice Overdue`,
    getMessage: (data: any) => `Invoice #${data.invoiceNumber} for ${data.clientName} is ${data.daysOverdue} days overdue`,
    getLink: (data: any) => `/invoices/${data.invoiceId}`,
  },
  task_assigned: {
    getTitle: (data: any) => `Task Assigned`,
    getMessage: (data: any) => `You've been assigned: ${data.taskTitle}`,
    getLink: (data: any) => `/tasks/${data.taskId}`,
  },
  appointment_reminder: {
    getTitle: (data: any) => `Appointment Reminder`,
    getMessage: (data: any) => `${data.title} starts in ${data.minutesUntil} minutes`,
    getLink: (data: any) => `/calendar?date=${data.date}`,
  },
  inventory_low: {
    getTitle: (data: any) => `Low Inventory Alert`,
    getMessage: (data: any) => `${data.productName} (${data.batchCode}) is running low: ${data.quantity} units remaining`,
    getLink: (data: any) => `/inventory/${data.batchId}`,
  },
  vip_order: {
    getTitle: (data: any) => `VIP Portal Order`,
    getMessage: (data: any) => `${data.clientName} placed an order via VIP Portal`,
    getLink: (data: any) => `/orders/${data.orderId}`,
  },
};

export async function notifyUsers(type: keyof typeof notificationTypes, data: any, userIds: number[]) {
  const typeConfig = notificationTypes[type];
  
  for (const userId of userIds) {
    await createAndSendNotification({
      userId,
      type,
      title: typeConfig.getTitle(data),
      message: typeConfig.getMessage(data),
      link: typeConfig.getLink(data),
      data,
    });
  }
}

// Notify by role
export async function notifyRole(type: keyof typeof notificationTypes, data: any, role: string) {
  const users = await db.query.users.findMany({
    where: eq(users.role, role),
  });
  
  await notifyUsers(type, data, users.map(u => u.id));
}
```

### Frontend: Notification Hook

```typescript
// client/src/hooks/useNotifications.ts

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useNotifications() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const websocket = new WebSocket(`${WS_URL}/ws?token=${token}`);

    websocket.onopen = () => {
      console.log('[WS] Connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'notification':
          setNotifications(prev => [data.notification, ...prev]);
          // Show toast
          toast({
            title: data.notification.title,
            description: data.notification.message,
            action: data.notification.link ? (
              <ToastAction onClick={() => navigate(data.notification.link)}>
                View
              </ToastAction>
            ) : undefined,
          });
          break;
        case 'unread_count':
          setUnreadCount(data.count);
          break;
        case 'data_update':
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: [data.entity] });
          break;
      }
    };

    websocket.onclose = () => {
      console.log('[WS] Disconnected');
      // Attempt reconnect after delay
      setTimeout(() => {
        setWs(null);
      }, 5000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    ws?.send(JSON.stringify({ type: 'mark_read', notificationId }));
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [ws]);

  const markAllAsRead = useCallback(() => {
    ws?.send(JSON.stringify({ type: 'mark_all_read' }));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [ws]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

### Frontend: Notification Center

```typescript
// client/src/components/NotificationCenter.tsx

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ notification, onRead, onClose }: {
  notification: Notification;
  onRead: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
        !notification.read && "bg-blue-50"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <NotificationIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-muted-foreground truncate">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
        )}
      </div>
    </div>
  );
}
```

---

## Task 2: Calendar Integration (3 hours)

### Backend: Calendar Events

```typescript
// server/routers/calendar.ts

export const calendarRouter = router({
  getEvents: protectedProcedure
    .input(z.object({
      start: z.date(),
      end: z.date(),
      types: z.array(z.enum(['appointment', 'task', 'delivery', 'reminder'])).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const events: CalendarEvent[] = [];

      // Get appointments
      if (!input.types || input.types.includes('appointment')) {
        const appointments = await db.query.appointments.findMany({
          where: and(
            or(
              eq(appointments.userId, ctx.user.id),
              eq(appointments.createdBy, ctx.user.id)
            ),
            gte(appointments.startTime, input.start),
            lte(appointments.endTime, input.end)
          ),
          with: { client: true },
        });

        events.push(...appointments.map(a => ({
          id: `appointment-${a.id}`,
          type: 'appointment' as const,
          title: a.title,
          start: a.startTime,
          end: a.endTime,
          allDay: false,
          color: '#3b82f6',
          data: {
            clientName: a.client?.name,
            location: a.location,
            notes: a.notes,
          },
        })));
      }

      // Get tasks with due dates
      if (!input.types || input.types.includes('task')) {
        const tasks = await db.query.tasks.findMany({
          where: and(
            eq(tasks.assignedTo, ctx.user.id),
            isNotNull(tasks.dueDate),
            gte(tasks.dueDate, input.start),
            lte(tasks.dueDate, input.end),
            ne(tasks.status, 'completed')
          ),
        });

        events.push(...tasks.map(t => ({
          id: `task-${t.id}`,
          type: 'task' as const,
          title: t.title,
          start: t.dueDate!,
          end: t.dueDate!,
          allDay: true,
          color: t.priority === 'high' ? '#ef4444' : '#f59e0b',
          data: {
            priority: t.priority,
            status: t.status,
          },
        })));
      }

      // Get scheduled deliveries
      if (!input.types || input.types.includes('delivery')) {
        const deliveries = await db.query.orders.findMany({
          where: and(
            isNotNull(orders.scheduledDeliveryDate),
            gte(orders.scheduledDeliveryDate, input.start),
            lte(orders.scheduledDeliveryDate, input.end),
            inArray(orders.status, ['confirmed', 'processing', 'ready'])
          ),
          with: { client: true },
        });

        events.push(...deliveries.map(d => ({
          id: `delivery-${d.id}`,
          type: 'delivery' as const,
          title: `Delivery: ${d.client.name}`,
          start: d.scheduledDeliveryDate!,
          end: d.scheduledDeliveryDate!,
          allDay: true,
          color: '#22c55e',
          data: {
            orderId: d.id,
            clientName: d.client.name,
            address: d.deliveryAddress,
          },
        })));
      }

      return events;
    }),

  createAppointment: protectedProcedure
    .input(appointmentSchema)
    .mutation(async ({ ctx, input }) => {
      const [appointment] = await db.insert(appointments)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      // Notify assigned user
      if (input.userId !== ctx.user.id) {
        await createAndSendNotification({
          userId: input.userId,
          type: 'appointment_created',
          title: 'New Appointment',
          message: `${ctx.user.name} scheduled: ${input.title}`,
          link: `/calendar?date=${format(input.startTime, 'yyyy-MM-dd')}`,
          data: { appointmentId: appointment.id },
        });
      }

      // Schedule reminder
      await scheduleAppointmentReminder(appointment);

      return appointment;
    }),

  updateAppointment: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: appointmentSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [appointment] = await db.update(appointments)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(appointments.id, input.id))
        .returning();

      // Reschedule reminder if time changed
      if (input.data.startTime) {
        await rescheduleAppointmentReminder(appointment);
      }

      return appointment;
    }),

  deleteAppointment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(appointments).where(eq(appointments.id, input.id));
      await cancelAppointmentReminder(input.id);
      return { success: true };
    }),
});

// Reminder scheduling
async function scheduleAppointmentReminder(appointment: Appointment) {
  const reminderTime = subMinutes(appointment.startTime, 30);
  
  if (reminderTime > new Date()) {
    await db.insert(scheduledJobs).values({
      type: 'appointment_reminder',
      runAt: reminderTime,
      data: { appointmentId: appointment.id },
    });
  }
}
```

### Frontend: Calendar Component

```typescript
// client/src/pages/CalendarPage.tsx

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date>();

  const { data: events, isLoading } = trpc.calendar.getEvents.useQuery(
    { start: dateRange?.start!, end: dateRange?.end! },
    { enabled: !!dateRange }
  );

  const handleDatesSet = (arg: any) => {
    setDateRange({ start: arg.start, end: arg.end });
  };

  const handleDateClick = (arg: any) => {
    setNewEventDate(arg.date);
    setShowCreateModal(true);
  };

  const handleEventClick = (arg: any) => {
    const event = events?.find(e => e.id === arg.event.id);
    if (event) {
      setSelectedEvent(event);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <EventTypeFilter />
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events?.map(e => ({
              id: e.id,
              title: e.title,
              start: e.start,
              end: e.end,
              allDay: e.allDay,
              backgroundColor: e.color,
              borderColor: e.color,
            }))}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={true}
            selectable={true}
            height="auto"
          />
        </CardContent>
      </Card>

      <CreateAppointmentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultDate={newEventDate}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
```

---

## Task 3: Scheduled Jobs System (2 hours)

### Job Scheduler

```typescript
// server/services/scheduler.ts

import cron from 'node-cron';

interface ScheduledJob {
  id: number;
  type: string;
  runAt: Date;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

const jobHandlers: Record<string, (data: any) => Promise<void>> = {
  appointment_reminder: async (data) => {
    const appointment = await getAppointment(data.appointmentId);
    if (!appointment) return;

    await createAndSendNotification({
      userId: appointment.userId,
      type: 'appointment_reminder',
      title: 'Appointment Reminder',
      message: `${appointment.title} starts in 30 minutes`,
      link: `/calendar?date=${format(appointment.startTime, 'yyyy-MM-dd')}`,
      data: { appointmentId: appointment.id },
    });

    // Send SMS if enabled
    const user = await getUser(appointment.userId);
    if (user.smsNotifications && user.phone) {
      await sendAppointmentReminderSMS(user, appointment);
    }
  },

  invoice_reminder: async (data) => {
    const invoice = await getInvoice(data.invoiceId);
    if (!invoice || invoice.status === 'paid') return;

    const client = await getClient(invoice.clientId);
    const daysOverdue = differenceInDays(new Date(), invoice.dueDate);

    // Notify sales team
    await notifyRole('invoice_overdue', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: client.name,
      daysOverdue,
    }, 'sales');

    // Send reminder email to client
    await sendInvoiceReminderEmail(invoice, client);

    // Send SMS if enabled and significantly overdue
    if (daysOverdue >= 7 && client.smsNotifications && client.phone) {
      await sendPaymentReminderSMS(client, invoice);
    }
  },

  low_inventory_check: async () => {
    const lowStockBatches = await db.query.batches.findMany({
      where: and(
        eq(batches.status, 'active'),
        lt(batches.quantity, batches.lowStockThreshold)
      ),
      with: { product: true },
    });

    for (const batch of lowStockBatches) {
      await notifyRole('inventory_low', {
        batchId: batch.id,
        batchCode: batch.code,
        productName: batch.product.name,
        quantity: batch.quantity,
        threshold: batch.lowStockThreshold,
      }, 'inventory');
    }
  },

  daily_digest: async () => {
    const users = await db.query.users.findMany({
      where: eq(users.dailyDigest, true),
    });

    for (const user of users) {
      const digest = await generateDailyDigest(user.id);
      if (digest.hasContent) {
        await sendDailyDigestEmail(user, digest);
      }
    }
  },
};

// Process pending jobs
async function processJobs() {
  const pendingJobs = await db.query.scheduledJobs.findMany({
    where: and(
      eq(scheduledJobs.status, 'pending'),
      lte(scheduledJobs.runAt, new Date())
    ),
    limit: 10,
  });

  for (const job of pendingJobs) {
    try {
      await db.update(scheduledJobs)
        .set({ status: 'running' })
        .where(eq(scheduledJobs.id, job.id));

      const handler = jobHandlers[job.type];
      if (handler) {
        await handler(job.data);
      } else {
        console.warn(`[Scheduler] Unknown job type: ${job.type}`);
      }

      await db.update(scheduledJobs)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(scheduledJobs.id, job.id));

    } catch (error) {
      console.error(`[Scheduler] Job ${job.id} failed:`, error);
      await db.update(scheduledJobs)
        .set({ 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date(),
        })
        .where(eq(scheduledJobs.id, job.id));
    }
  }
}

// Initialize scheduler
export function initScheduler() {
  // Process jobs every minute
  cron.schedule('* * * * *', processJobs);

  // Daily low inventory check at 8am
  cron.schedule('0 8 * * *', () => {
    db.insert(scheduledJobs).values({
      type: 'low_inventory_check',
      runAt: new Date(),
      data: {},
    });
  });

  // Daily digest at 7am
  cron.schedule('0 7 * * *', () => {
    db.insert(scheduledJobs).values({
      type: 'daily_digest',
      runAt: new Date(),
      data: {},
    });
  });

  // Invoice reminders - check daily at 9am
  cron.schedule('0 9 * * *', async () => {
    const overdueInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.status, 'pending'),
        lt(invoices.dueDate, new Date())
      ),
    });

    for (const invoice of overdueInvoices) {
      await db.insert(scheduledJobs).values({
        type: 'invoice_reminder',
        runAt: new Date(),
        data: { invoiceId: invoice.id },
      });
    }
  });

  console.log('[Scheduler] Initialized');
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-7-notifications-calendar

git add server/websocket.ts server/services/notificationService.ts
git commit -m "feat(NOTIF-1): Implement real-time WebSocket notifications"

git add client/src/hooks/useNotifications.ts client/src/components/NotificationCenter.tsx
git commit -m "feat(NOTIF-2): Add notification center UI with real-time updates"

git add server/routers/calendar.ts client/src/pages/CalendarPage.tsx
git commit -m "feat(CAL-1): Implement calendar with appointments, tasks, deliveries"

git add server/services/scheduler.ts
git commit -m "feat(SCHED-1): Add scheduled jobs system for reminders"

git push origin feat/wave-7-notifications-calendar
```

---

## Success Criteria

- [ ] WebSocket connection established on login
- [ ] Real-time notifications appear instantly
- [ ] Notification badge shows unread count
- [ ] Mark as read works (single and all)
- [ ] Calendar shows appointments, tasks, deliveries
- [ ] Can create/edit/delete appointments
- [ ] Appointment reminders sent 30 min before
- [ ] Low inventory alerts work
- [ ] Invoice reminders sent for overdue invoices
- [ ] Daily digest emails sent

---

## Handoff

After Wave 7 completion:

1. Test WebSocket reconnection on network issues
2. Verify notification preferences are respected
3. Test calendar across timezones
4. Document scheduled job types

**Next**: Wave 8 (Technical Debt & Polish)

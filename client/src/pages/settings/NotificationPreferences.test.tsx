/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPreferencesPage } from "./NotificationPreferences";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mockUpdate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useContext: vi.fn(() => ({
      notifications: {
        getPreferences: { invalidate: vi.fn() },
      },
    })),
    notifications: {
      getPreferences: {
        useQuery: vi.fn(() => ({
          data: {
            inAppEnabled: true,
            emailEnabled: true,
            appointmentReminders: true,
            orderUpdates: false,
            systemAlerts: true,
          },
          isLoading: false,
        })),
      },
      updatePreferences: {
        useMutation: vi.fn(() => ({
          mutate: mockUpdate,
          isLoading: false,
        })),
      },
    },
  },
}));

describe("NotificationPreferencesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <ThemeProvider>
        <NotificationPreferencesPage />
      </ThemeProvider>
    );

  it("renders toggle controls for each preference", () => {
    renderPage();
    expect(screen.getByLabelText(/in-app notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/appointment reminders/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order updates/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system alerts/i)).toBeInTheDocument();
  });

  it("submits updated preferences", () => {
    renderPage();

    const orderToggle = screen.getByLabelText(/order updates/i);
    fireEvent.click(orderToggle);

    const saveButton = screen.getByRole("button", { name: /save preferences/i });
    fireEvent.click(saveButton);

    expect(mockUpdate).toHaveBeenCalledWith({
      orderUpdates: true,
      inAppEnabled: true,
      emailEnabled: true,
      appointmentReminders: true,
      systemAlerts: true,
    });
  });
});

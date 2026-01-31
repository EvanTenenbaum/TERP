/**
 * ClientProfilePage Tests
 *
 * Tests for BUG-104: Proper error handling distinction between
 * query errors and null results in ClientProfilePage
 *
 * @vitest-environment jsdom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Test files require flexible typing for mocks

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClientProfilePage from "../ClientProfilePage";

// Mock dependencies
const mockUseQuery = vi.fn();
const mockRefetch = vi.fn();
const mockInvalidate = vi.fn();
const mockUseMutation = vi.fn();
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useParams: () => ({ id: "123" }),
  useLocation: () => ["/clients/123", mockSetLocation],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      getById: {
        useQuery: (input?: unknown) => mockUseQuery(input),
      },
      transactions: {
        list: {
          useQuery: () => ({
            data: [],
            isLoading: false,
            refetch: vi.fn(),
          }),
        },
        create: {
          useMutation: () => mockUseMutation(),
        },
        recordPayment: {
          useMutation: () => mockUseMutation(),
        },
      },
      activity: {
        list: {
          useQuery: () => ({
            data: [],
          }),
        },
      },
      notes: {
        getNoteId: {
          useQuery: () => ({
            data: null,
          }),
        },
      },
      update: {
        useMutation: () => mockUseMutation(),
      },
    },
    useUtils: () => ({
      clients: {
        getById: {
          invalidate: mockInvalidate,
        },
        list: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

vi.mock("@/hooks/useCreditVisibility", () => ({
  useCreditVisibility: () => ({
    shouldShowCreditWidgetInProfile: false,
  }),
}));

vi.mock("@/hooks/useOptimisticLocking", () => ({
  useOptimisticLocking: () => ({
    handleMutationError: vi.fn(),
    ConflictDialogComponent: null,
  }),
}));

// Mock all the child components to avoid dependency issues
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <button>Back to Clients</button>,
}));

vi.mock("@/components/common/PageErrorBoundary", () => ({
  PageErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton-loaders", () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}));

// Mock all other complex components
vi.mock("@/components/credit/CreditStatusCard", () => ({
  CreditStatusCard: () => <div>Credit Status</div>,
}));

vi.mock("@/components/pricing/PricingConfigTab", () => ({
  PricingConfigTab: () => <div>Pricing Config</div>,
}));

vi.mock("@/components/needs/ClientNeedsTab", () => ({
  ClientNeedsTab: () => <div>Client Needs</div>,
}));

vi.mock("@/components/clients/CommunicationTimeline", () => ({
  CommunicationTimeline: () => <div>Communication Timeline</div>,
}));

vi.mock("@/components/clients/AddCommunicationModal", () => ({
  AddCommunicationModal: () => <div>Add Communication Modal</div>,
}));

vi.mock("@/components/clients/PurchasePatternsWidget", () => ({
  PurchasePatternsWidget: () => <div>Purchase Patterns</div>,
}));

vi.mock("@/components/clients/ClientCalendarTab", () => ({
  ClientCalendarTab: () => <div>Client Calendar</div>,
}));

vi.mock("@/components/clients/SupplierProfileSection", () => ({
  SupplierProfileSection: () => <div>Supplier Profile</div>,
}));

vi.mock("@/components/comments/CommentWidget", () => ({
  CommentWidget: () => <div>Comments</div>,
}));

vi.mock("@/components/vip-portal/LiveCatalogConfig", () => ({
  LiveCatalogConfig: () => <div>Live Catalog</div>,
}));

vi.mock("@/components/clients/VIPPortalSettings", () => ({
  VIPPortalSettings: () => <div>VIP Portal Settings</div>,
}));

vi.mock("@/components/clients/CustomerWishlistCard", () => ({
  CustomerWishlistCard: () => <div>Customer Wishlist</div>,
}));

vi.mock("@/components/dashboard/widgets-v2", () => ({
  FreeformNoteWidget: () => <div>Notes Widget</div>,
}));

vi.mock("@/components/audit", () => ({
  AuditIcon: () => <span>Audit</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

describe("ClientProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe("error handling (BUG-104)", () => {
    it("should show error UI when query fails", () => {
      // Arrange - Mock query to return error
      const mockError = new Error("Network failure");
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);

      // Assert - Error UI should be shown
      expect(screen.getByText("Error loading client")).toBeInTheDocument();
      // The error message should display the error.message
      expect(screen.getByText("Network failure")).toBeInTheDocument();

      // Retry button should be visible
      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Client profile content should NOT be shown
      expect(screen.queryByText("Client Information")).not.toBeInTheDocument();
    });

    it("should call refetch when retry button is clicked", () => {
      // Arrange - Mock query to return error
      const mockError = new Error("Network failure");
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);
      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledOnce();
    });

    it("should show not found UI when client is null", () => {
      // Arrange - Mock query to succeed but return null
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);

      // Assert - Not found UI should be shown
      expect(screen.getByText("Client not found")).toBeInTheDocument();
      expect(
        screen.getByText(/Client with ID 123 does not exist/i)
      ).toBeInTheDocument();

      // Back button should be visible
      const backButton = screen.getByRole("button", {
        name: /back to clients/i,
      });
      expect(backButton).toBeInTheDocument();

      // Error UI should NOT be shown
      expect(
        screen.queryByText("Error loading client")
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
    });

    it("should navigate to /clients when back button is clicked on not found page", () => {
      // Arrange - Mock query to succeed but return null
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);
      const backButton = screen.getByRole("button", {
        name: /back to clients/i,
      });
      fireEvent.click(backButton);

      // Assert
      expect(mockSetLocation).toHaveBeenCalledWith("/clients");
    });

    it("should render profile when client exists", () => {
      // Arrange - Mock query to return valid client data
      const mockClient = {
        id: 123,
        teriCode: "TEST-001",
        name: "Test Client",
        email: "test@example.com",
        phone: "555-1234",
        address: "123 Test St",
        isBuyer: true,
        isSeller: false,
        isBrand: false,
        isReferee: false,
        isContractor: false,
        totalSpent: "10000.00",
        totalProfit: "2000.00",
        avgProfitMargin: "20.00",
        totalOwed: "500.00",
        oldestDebtDays: 30,
        tags: ["VIP", "Wholesale"],
        version: 1,
        vipPortalEnabled: false,
        vipPortalLastLogin: null,
        wishlist: "",
      };

      mockUseQuery.mockReturnValue({
        data: mockClient,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);

      // Assert - Client profile should be shown
      // These values appear multiple times (header and info section), so use getAllByText
      expect(screen.getAllByText("TEST-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Client").length).toBeGreaterThan(0);
      expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);

      // Error UI should NOT be shown
      expect(
        screen.queryByText("Error loading client")
      ).not.toBeInTheDocument();

      // Not found UI should NOT be shown
      expect(screen.queryByText("Client not found")).not.toBeInTheDocument();

      // Profile content should be visible
      expect(screen.getByText("Client Information")).toBeInTheDocument();
    });

    it("should show loading skeleton while fetching", () => {
      // Arrange - Mock query to be in loading state
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      // Act
      render(<ClientProfilePage />);

      // Assert - Loading skeleton should be shown
      expect(screen.getByTestId("page-skeleton")).toBeInTheDocument();

      // Neither error nor not found UI should be shown
      expect(
        screen.queryByText("Error loading client")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Client not found")).not.toBeInTheDocument();
    });
  });
});

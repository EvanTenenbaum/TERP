# Requirements Document

## Introduction

This specification defines a unified sales system that consolidates the current fragmented sales tools (Orders, Quotes, Sales Sheets, Create Order) into a single, elegant workflow. The centerpiece is a **Live Shopping** experience where clients browse inventory on an iPad in the showroom while staff monitor and assist in real-time. The system supports both in-person live shopping sessions and traditional remote/phone order creation, with all paths converging into a single order pipeline.

## Glossary

- **Live Shopping Session**: A real-time, collaborative shopping experience where a client browses inventory (typically on an iPad) while staff monitors their activity and can adjust pricing on the fly
- **Shopping Cart**: A temporary collection of items a client is interested in during a session, with quantities and pricing
- **Sample Request**: An item marked by the client to physically examine before deciding to purchase
- **Staff Console**: The internal interface where staff monitors live sessions, sees client activity, adjusts pricing, and manages the sales process
- **Client View**: The customer-facing interface (iPad/tablet optimized) showing inventory with their personalized pricing
- **Session Pricing Override**: Temporary price adjustments made by staff during a live session that apply only to that session
- **Catalog View Preset**: A saved filter/sort configuration that can be assigned to clients or used as defaults
- **Draft Order**: An order in progress that hasn't been finalized/confirmed
- **Confirmed Order**: A finalized order ready for fulfillment and invoicing

## Requirements

### Requirement 1: Unified Order Model

**User Story:** As a system administrator, I want a single order model that handles all sales scenarios, so that we eliminate redundancy and simplify the codebase.

#### Acceptance Criteria

1. THE system SHALL use a single `orders` table for all sales transactions regardless of origin (live shopping, phone order, VIP portal self-service)
2. WHEN an order is created THE system SHALL record the origin channel (LIVE_SHOPPING, STAFF_CREATED, VIP_SELF_SERVICE, PHONE_ORDER)
3. THE system SHALL support order statuses: DRAFT, PENDING_APPROVAL, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
4. WHEN a draft order exists THE system SHALL allow modifications until the order is confirmed
5. THE system SHALL deprecate the separate "quote" concept by treating unconfirmed orders as the equivalent of quotes

### Requirement 2: Live Shopping Session Management

**User Story:** As a sales staff member, I want to initiate and manage live shopping sessions for clients visiting the showroom, so that I can provide a personalized, interactive sales experience.

#### Acceptance Criteria

1. WHEN a staff member initiates a live shopping session THE system SHALL create a session record linked to the client and staff member
2. THE system SHALL generate a unique session URL/code that can be opened on the client's device (iPad)
3. WHILE a session is active THE system SHALL track session state including: start time, client ID, staff ID, assigned catalog view, and session-specific pricing overrides
4. WHEN a session is active THE system SHALL allow the staff member to end the session at any time
5. IF a session is inactive for more than 30 minutes THEN THE system SHALL automatically mark it as expired
6. THE system SHALL support multiple concurrent live shopping sessions for different clients

### Requirement 3: Client Shopping Interface (iPad View)

**User Story:** As a client in the showroom, I want to browse available inventory on an iPad with my personalized pricing visible, so that I can make informed purchasing decisions.

#### Acceptance Criteria

1. WHEN a client opens their session link THE system SHALL display the inventory catalog with their personalized retail pricing
2. THE system SHALL NOT display COGS, margins, or any internal pricing data to the client
3. THE system SHALL allow clients to filter inventory by category, strain, grade, and other attributes
4. THE system SHALL allow clients to sort inventory by name, price, quantity available, or date added
5. WHEN a staff member assigns a preset view THE system SHALL apply those filters as the default while allowing the client to modify them
6. THE system SHALL display real-time stock levels (in stock, low stock, out of stock indicators)
7. THE system SHALL be optimized for tablet touch interfaces with large tap targets and swipe gestures

### Requirement 4: Sample Request Flow

**User Story:** As a client, I want to mark items I'd like to sample before purchasing, so that warehouse staff can bring them to me for inspection.

#### Acceptance Criteria

1. WHEN a client marks an item for sampling THE system SHALL add it to a "Sample Requests" list with a REQUESTED status
2. WHEN an item is marked for sampling THE system SHALL immediately notify the staff console in real-time
3. THE system SHALL display sample requests to warehouse staff with item location and quantity requested
4. WHEN warehouse staff acknowledges a sample request THE system SHALL update the status to IN_PROGRESS
5. WHEN the sample is delivered to the client THE system SHALL update the status to DELIVERED
6. AFTER reviewing a sample THE client SHALL be able to mark it as "Want to Buy" or "Pass"

### Requirement 5: Shopping Cart Management

**User Story:** As a client, I want to add items to my cart with specific quantities, so that I can build my order during the shopping session.

#### Acceptance Criteria

1. WHEN a client adds an item to cart THE system SHALL record the batch ID, quantity, and current session price
2. THE system SHALL validate that requested quantity does not exceed available inventory
3. THE system SHALL allow clients to modify quantities or remove items from cart
4. THE system SHALL display a running total of the cart value
5. WHEN inventory changes during a session THE system SHALL notify the client if an item in their cart is no longer available in the requested quantity
6. THE system SHALL persist cart contents for the duration of the session

### Requirement 6: Real-Time Staff Monitoring

**User Story:** As a sales staff member, I want to see what clients are browsing and adding to their cart in real-time, so that I can provide timely assistance and close sales.

#### Acceptance Criteria

1. WHILE a live session is active THE system SHALL display client browsing activity to the staff console within 2 seconds
2. THE system SHALL show which items the client is currently viewing
3. THE system SHALL show the client's current cart contents with quantities and prices
4. THE system SHALL show sample requests with their current status
5. THE system SHALL highlight when a client adds or removes items from their cart
6. THE system SHALL support monitoring multiple active sessions simultaneously

### Requirement 7: Session Pricing Controls

**User Story:** As a sales staff member, I want to adjust pricing during a live session at multiple levels, so that I can negotiate deals and offer discounts.

#### Acceptance Criteria

1. THE system SHALL allow staff to adjust price on individual line items (specific SKU in cart) by dollar amount or percentage
2. THE system SHALL allow staff to adjust price on all units of a specific batch in the cart by dollar amount or percentage
3. THE system SHALL allow staff to apply a discount to the entire order total by dollar amount or percentage
4. WHEN staff makes a price adjustment THE system SHALL record the original price, adjusted price, adjustment type, and reason
5. THE system SHALL allow staff to choose whether price adjustments are visible to the client (show as discount) or hidden (just show final price)
6. WHEN a discount is shown to client THE system SHALL display the original price with strikethrough and the new price
7. THE system SHALL calculate and display margin impact of pricing changes to staff (but never to client)

### Requirement 8: COGS and Margin Visibility Toggle

**User Story:** As a sales staff member, I want to toggle visibility of COGS and margin information on my console, so that I can make informed pricing decisions while optionally hiding sensitive data when clients might see my screen.

#### Acceptance Criteria

1. THE system SHALL provide a toggle to show/hide COGS on the staff console
2. THE system SHALL provide a toggle to show/hide margin (both dollar and percentage) on the staff console
3. WHEN COGS/margin is hidden THE system SHALL remember this preference for the session
4. THE system SHALL default to showing COGS/margin when a new session starts
5. THE system SHALL NEVER display COGS or margin data on the client view regardless of any setting

### Requirement 9: Session to Order Conversion

**User Story:** As a sales staff member, I want to convert a completed live shopping session into a confirmed order, so that the sale can be processed and fulfilled.

#### Acceptance Criteria

1. WHEN a client indicates they are done shopping THE staff SHALL be able to review the final cart
2. THE system SHALL display a summary showing all items, quantities, prices (including any adjustments), and total
3. THE system SHALL allow final adjustments before confirmation
4. WHEN staff confirms the order THE system SHALL create an order record with status CONFIRMED
5. THE system SHALL record all pricing adjustments made during the session as part of the order history
6. THE system SHALL reserve inventory for confirmed orders
7. THE system SHALL generate an order confirmation that can be shown to or emailed to the client

### Requirement 10: Traditional Order Creation (Non-Live)

**User Story:** As a sales staff member, I want to create orders for clients who are not physically present (phone orders, repeat orders), so that all sales go through the same unified system.

#### Acceptance Criteria

1. THE system SHALL provide a staff-only order creation interface that does not require a live session
2. WHEN creating a traditional order THE staff SHALL select a client and browse inventory with that client's pricing
3. THE system SHALL allow staff to add items, adjust quantities, and apply pricing overrides just like in live sessions
4. THE system SHALL allow saving orders as drafts for later completion
5. WHEN a traditional order is confirmed THE system SHALL process it identically to a live shopping order
6. THE system SHALL support converting a draft order into a live session if the client arrives in person

### Requirement 11: Catalog View Presets

**User Story:** As a sales staff member, I want to create and assign catalog view presets to clients, so that they see a curated selection when they start shopping.

#### Acceptance Criteria

1. THE system SHALL allow staff to create named view presets with specific filters (categories, grades, price ranges, etc.)
2. THE system SHALL allow assigning a default preset to a client's profile
3. THE system SHALL allow selecting a different preset when starting a live session
4. THE system SHALL include system-wide default presets (e.g., "All Products", "New Arrivals", "On Sale")
5. WHEN a preset is assigned THE client SHALL see those filters applied by default but can modify them
6. THE system SHALL allow staff to save the current filter state as a new preset

### Requirement 12: VIP Portal Self-Service Integration

**User Story:** As a VIP client using the portal remotely, I want to browse the catalog and submit orders myself, so that I can place orders without visiting the showroom.

#### Acceptance Criteria

1. WHEN a client has VIP portal access with self-service enabled THE system SHALL allow them to browse the catalog independently
2. THE system SHALL apply the client's personalized pricing automatically
3. THE system SHALL allow clients to add items to cart and submit orders
4. WHEN a self-service order is submitted THE system SHALL create it with status PENDING_APPROVAL (configurable per client)
5. WHERE a client has auto-approval enabled THE system SHALL create orders with status CONFIRMED directly
6. THE system SHALL notify staff when a self-service order is submitted for approval
7. THE system SHALL use the same cart and order model as live shopping sessions

### Requirement 13: Deprecation of Legacy Systems

**User Story:** As a system administrator, I want to deprecate the redundant sales tools, so that we have a single, maintainable sales system.

#### Acceptance Criteria

1. THE system SHALL mark the standalone "Sales Sheet Creator" as deprecated
2. THE system SHALL mark the separate "Quote" order type as deprecated (use Draft Order instead)
3. THE system SHALL provide migration path for existing quotes to draft orders
4. THE system SHALL maintain read-only access to historical sales sheets and quotes
5. THE system SHALL consolidate all order creation entry points to the unified system within 90 days of launch

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";

// Import sub-components (QA refactoring per PR #110 review)
import { CalendarGeneralSettings } from "./settings/CalendarGeneralSettings";
import { CalendarAppointmentTypes } from "./settings/CalendarAppointmentTypes";
import { CalendarAvailabilitySettings } from "./settings/CalendarAvailabilitySettings";

/**
 * Calendar Settings Component
 * CAL-001 & CAL-002: Calendar management, appointment types, and availability
 *
 * Refactored per QA review (PR #110):
 * - Split into sub-components for maintainability
 * - CalendarGeneralSettings: Calendar CRUD operations
 * - CalendarAppointmentTypes: Appointment type management
 * - CalendarAvailabilitySettings: Availability and blocked dates
 */
export function CalendarSettings() {
  const [activeTab, setActiveTab] = useState("calendars");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Management
        </CardTitle>
        <CardDescription>
          Configure calendars, appointment types, and availability schedules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendars">Calendars</TabsTrigger>
            <TabsTrigger value="appointment-types">Appointment Types</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>
          <TabsContent value="calendars" className="mt-4">
            <CalendarGeneralSettings />
          </TabsContent>
          <TabsContent value="appointment-types" className="mt-4">
            <CalendarAppointmentTypes />
          </TabsContent>
          <TabsContent value="availability" className="mt-4">
            <CalendarAvailabilitySettings />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CalendarSettings;

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  FileText,
  Lightbulb,
  Target,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: Record<string, unknown>; // Tiptap JSON content
}

export const templates: Template[] = [
  {
    id: "TODO",
    name: "To-Do List",
    description: "Organize tasks with checkboxes and priorities",
    icon: CheckSquare,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "To-Do List" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Task 1" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Task 2" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Task 3" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "MEETING_NOTES",
    name: "Meeting Notes",
    description: "Structured template for meeting minutes",
    icon: FileText,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Meeting Notes" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Date & Attendees" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Date: " },
            { type: "text", text: "[Insert date]" },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Attendees: " },
            { type: "text", text: "[List attendees]" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Agenda" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Topic 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Topic 2" }],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Discussion" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "[Meeting notes go here]" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Action Items" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Action item 1" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "BRAINSTORM",
    name: "Brainstorm",
    description: "Capture ideas and creative thinking",
    icon: Lightbulb,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Brainstorm Session" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Topic: " },
            { type: "text", text: "[What are we brainstorming?]" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Ideas" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Idea 1" }],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Sub-idea or detail" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Idea 2" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Idea 3" }],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Next Steps" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Research idea 1" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "GOALS",
    name: "Goals & OKRs",
    description: "Track objectives and key results",
    icon: Target,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Goals & OKRs" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Period: " },
            { type: "text", text: "Q1 2025" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Objective 1" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "[Describe your objective]" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Key Results:" },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "KR 1: [Measurable result]" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "KR 2: [Measurable result]" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "KR 3: [Measurable result]" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "MESSAGE_BOARD",
    name: "Message Board",
    description: "Team announcements and updates",
    icon: MessageSquare,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Team Message Board" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "📢 Announcements" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "[Important team updates go here]" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "🎉 Wins & Celebrations" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "[Share team successes]" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "💡 Ideas & Suggestions" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "[Team feedback and ideas]" }],
        },
      ],
    },
  },
  {
    id: "BLANK",
    name: "Blank Note",
    description: "Start from scratch",
    icon: Sparkles,
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    },
  },
];

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start with a pre-designed template to organize your thoughts
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}


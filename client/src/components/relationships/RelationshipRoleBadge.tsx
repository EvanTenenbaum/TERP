import { Badge } from "@/components/ui/badge";
import { RELATIONSHIP_ROLE_TOKENS } from "@/lib/statusTokens";
import { cn } from "@/lib/utils";

interface RelationshipRoleBadgeProps {
  role: string;
  className?: string;
}

export function RelationshipRoleBadge({
  role,
  className,
}: RelationshipRoleBadgeProps) {
  const toneClass =
    RELATIONSHIP_ROLE_TOKENS[
      role as keyof typeof RELATIONSHIP_ROLE_TOKENS
    ] ?? RELATIONSHIP_ROLE_TOKENS.Contractor;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs", toneClass, className)}
      data-testid={`relationship-role-badge-${role}`}
    >
      {role}
    </Badge>
  );
}

export default RelationshipRoleBadge;

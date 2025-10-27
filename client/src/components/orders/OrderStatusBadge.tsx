import { Badge } from '@/components/ui/badge';

interface OrderStatusBadgeProps {
  status: 'PENDING' | 'PACKED' | 'SHIPPED';
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const variants = {
    PENDING: { 
      label: 'Pending', 
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
    },
    PACKED: { 
      label: 'Packed', 
      className: 'bg-blue-100 text-blue-800 border-blue-300' 
    },
    SHIPPED: { 
      label: 'Shipped', 
      className: 'bg-green-100 text-green-800 border-green-300' 
    },
  };

  const config = variants[status];

  return (
    <Badge className={`${config.className} ${className || ''}`} variant="outline">
      {config.label}
    </Badge>
  );
}


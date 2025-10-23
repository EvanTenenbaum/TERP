_**OVERWRITE**_
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { columns, Quote } from "./columns";
import { PlusCircle } from "lucide-react";

async function getData(): Promise<Quote[]> {
  // Fetch data from your API here.
  // This is a mock implementation.
  const res = await fetch('/api/quotes');
  if (!res.ok) throw new Error('Failed to fetch quotes');
  const data = await res.json();
  return data.quotes || data;
}

export default function QuotesPage() {
  const [data, setData] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData().then((fetchedData) => {
      setData(fetchedData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales Quotes</h1>
          <p className="text-muted-foreground mt-1">
            Manage quotes and convert them to orders.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}


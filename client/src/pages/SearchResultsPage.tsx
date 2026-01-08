import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Users, Package, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function SearchResultsPage() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialQuery = params.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Update query when URL changes
  useEffect(() => {
    const newParams = new URLSearchParams(location.split("?")[1] || "");
    const newQuery = newParams.get("q") || "";
    setSearchQuery(newQuery);
  }, [location]);

  // Fetch search results
  const {
    data: results,
    isLoading,
    error,
  } = trpc.search.global.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {searchQuery
              ? `Results for "${searchQuery}"`
              : "Enter a search query"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search quotes, customers, products..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!searchQuery.trim()}>
              Search
            </Button>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Error searching: {error.message}</p>
            </div>
          )}

          {/* No Query State */}
          {!searchQuery.trim() && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>
                Enter a search query to find quotes, customers, and products.
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && searchQuery.trim() && results && (
            <div className="space-y-6">
              {/* Quotes Section */}
              {results.quotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">
                      Quotes ({results.quotes.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.quotes.map(quote => (
                      <Link key={quote.id} href={quote.url}>
                        <Card className="hover:bg-accent cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">{quote.title}</h3>
                                  <Badge variant="outline">Quote</Badge>
                                </div>
                                {quote.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {quote.description}
                                  </p>
                                )}
                                {quote.metadata?.total !== null &&
                                  quote.metadata?.total !== undefined && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Total: $
                                      {Number(
                                        quote.metadata.total as number
                                      ).toFixed(2)}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Section */}
              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">
                      Customers ({results.customers.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.customers.map(customer => (
                      <Link key={customer.id} href={customer.url}>
                        <Card className="hover:bg-accent cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">
                                    {customer.title}
                                  </h3>
                                  <Badge variant="outline">Customer</Badge>
                                </div>
                                {customer.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {customer.description}
                                  </p>
                                )}
                                {customer.metadata?.phone !== null &&
                                  customer.metadata?.phone !== undefined && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Phone: {String(customer.metadata.phone)}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Products Section */}
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">
                      Products ({results.products.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {results.products.map(product => (
                      <Link key={product.id} href={product.url}>
                        <Card className="hover:bg-accent cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">
                                    {product.title}
                                  </h3>
                                  <Badge variant="outline">Product</Badge>
                                </div>
                                {product.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  {product.metadata?.quantityAvailable !==
                                    null &&
                                    product.metadata?.quantityAvailable !==
                                      undefined && (
                                      <span>
                                        Qty:{" "}
                                        {Number(
                                          product.metadata
                                            .quantityAvailable as number
                                        )}
                                      </span>
                                    )}
                                  {product.metadata?.unitPrice !== null &&
                                    product.metadata?.unitPrice !==
                                      undefined && (
                                      <span>
                                        Price: $
                                        {Number(
                                          product.metadata.unitPrice as number
                                        ).toFixed(2)}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {results.quotes.length === 0 &&
                results.customers.length === 0 &&
                results.products.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No results found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try a different search term</p>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

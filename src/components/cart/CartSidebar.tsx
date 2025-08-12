'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useCart } from '@/hooks/useCart';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuote: () => void;
}

export default function CartSidebar({ isOpen, onClose, onCreateQuote }: CartSidebarProps) {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(0)}`;
  };

  const handleCreateQuote = () => {
    if (items.length === 0) {
      alert('Please add items to your cart before creating a quote.');
      return;
    }
    onCreateQuote();
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-medium text-gray-900">
                          Shopping Cart
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-8">
                        <div className="flow-root">
                          {items.length === 0 ? (
                            <div className="text-center py-12">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0L5.4 5M7 13h10"
                                />
                              </svg>
                              <h3 className="mt-2 text-sm font-medium text-gray-900">
                                Your cart is empty
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Start adding products to create a quote.
                              </p>
                            </div>
                          ) : (
                            <ul role="list" className="-my-6 divide-y divide-gray-200">
                              {items.map((item) => (
                                <li key={`${item.productId}-${item.batchId}`} className="flex py-6">
                                  <div className="flex-1 ml-4 flex flex-col">
                                    <div>
                                      <div className="flex justify-between text-base font-medium text-gray-900">
                                        <h3>{item.name}</h3>
                                        <p className="ml-4">{formatPrice(item.price * item.quantity)}</p>
                                      </div>
                                      <p className="mt-1 text-sm text-gray-500">SKU: {item.sku}</p>
                                      <p className="text-sm text-gray-500">Vendor: {item.vendorCode}</p>
                                      <p className="text-sm text-gray-500">Location: {item.location}</p>
                                      <p className="text-sm text-gray-500">
                                        {formatPrice(item.price)} per {item.unit}
                                      </p>
                                    </div>
                                    <div className="flex flex-1 items-end justify-between text-sm">
                                      <div className="flex items-center">
                                        <label htmlFor={`quantity-${item.productId}`} className="sr-only">
                                          Quantity
                                        </label>
                                        <select
                                          id={`quantity-${item.productId}`}
                                          value={item.quantity}
                                          onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                                          className="rounded border border-gray-300 text-left text-base font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                        >
                                          {Array.from({ length: Math.min(item.maxQuantity, 20) }, (_, i) => i + 1).map((num) => (
                                            <option key={num} value={num}>
                                              {num}
                                            </option>
                                          ))}
                                        </select>
                                        <span className="ml-2 text-gray-500">
                                          of {item.maxQuantity} available
                                        </span>
                                      </div>

                                      <div className="flex">
                                        <button
                                          type="button"
                                          onClick={() => removeFromCart(item.productId)}
                                          className="font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <p>Subtotal</p>
                          <p>{formatPrice(getTotalPrice())}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          Final pricing will be confirmed in your quote.
                        </p>
                        <div className="mt-6 space-y-3">
                          <button
                            onClick={handleCreateQuote}
                            className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Create Quote
                          </button>
                          <button
                            onClick={clearCart}
                            className="w-full flex justify-center items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Clear Cart
                          </button>
                        </div>
                        <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                          <p>
                            or{' '}
                            <button
                              type="button"
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                              onClick={onClose}
                            >
                              Continue Shopping
                              <span aria-hidden="true"> &rarr;</span>
                            </button>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}


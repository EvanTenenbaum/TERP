/**
 * Room Management Modal Component
 * Sprint 4 Track D: MEET-047 - Multiple Rooms Management
 *
 * Admin modal for creating/editing rooms
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Plus, Building2, Truck, Trash2, Edit2, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface RoomManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#84CC16", // Lime
];

interface RoomFormData {
  name: string;
  description: string;
  roomType: "meeting" | "loading";
  capacity: number;
  color: string;
  features: string[];
}

export function RoomManagementModal({
  isOpen,
  onClose,
}: RoomManagementModalProps) {
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<RoomFormData>({
    name: "",
    description: "",
    roomType: "meeting",
    capacity: 1,
    color: COLOR_PALETTE[0],
    features: [],
  });
  const [featureInput, setFeatureInput] = useState("");
  const [deleteFeatureConfirm, setDeleteFeatureConfirm] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: rooms = [], isLoading } = trpc.scheduling.listRooms.useQuery({
    isActive: true,
  });

  const createRoom = trpc.scheduling.createRoom.useMutation({
    onSuccess: () => {
      utils.scheduling.listRooms.invalidate();
      resetForm();
    },
  });

  const updateRoom = trpc.scheduling.updateRoom.useMutation({
    onSuccess: () => {
      utils.scheduling.listRooms.invalidate();
      setEditingRoom(null);
      resetForm();
    },
  });

  const deleteRoom = trpc.scheduling.deleteRoom.useMutation({
    onSuccess: () => {
      utils.scheduling.listRooms.invalidate();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      roomType: "meeting",
      capacity: 1,
      color: COLOR_PALETTE[0],
      features: [],
    });
    setFeatureInput("");
    setShowCreateForm(false);
  };

  const handleEdit = (room: RoomCardProps["room"]) => {
    setEditingRoom(room.id);
    setFormData({
      name: room.name,
      description: room.description || "",
      roomType: room.roomType as "meeting" | "loading",
      capacity: room.capacity || 1,
      color: room.color,
      features: room.features || [],
    });
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRoom) {
      updateRoom.mutate({
        id: editingRoom,
        data: formData,
      });
    } else {
      createRoom.mutate(formData);
    }
  };

  const addFeature = () => {
    if (
      featureInput.trim() &&
      !formData.features.includes(featureInput.trim())
    ) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter(f => f !== feature),
    });
  };

  if (!isOpen) return null;

  const meetingRooms = rooms.filter(r => r.roomType === "meeting");
  const loadingDocks = rooms.filter(r => r.roomType === "loading");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Manage Rooms
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Create/Edit Form */}
            {showCreateForm ? (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <h3 className="font-medium text-gray-900">
                  {editingRoom ? "Edit Room" : "Add New Room"}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Room name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.roomType}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          roomType: e.target.value as "meeting" | "loading",
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="meeting">Meeting Room</option>
                      <option value="loading">Loading Dock</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          capacity: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            formData.color === color
                              ? "border-gray-900 scale-110"
                              : "border-transparent hover:border-gray-300"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Features
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      onKeyPress={e =>
                        e.key === "Enter" && (e.preventDefault(), addFeature())
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add feature (e.g., Projector, Whiteboard)"
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {formData.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map(feature => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => setDeleteFeatureConfirm(feature)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoom(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRoom.isPending || updateRoom.isPending}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    {editingRoom ? "Save Changes" : "Create Room"}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors mb-6"
              >
                <Plus className="h-5 w-5" />
                Add New Room
              </button>
            )}

            {/* Room Lists */}
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={`skeleton-${i}`} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            ) : (
              <>
                {/* Meeting Rooms */}
                {meetingRooms.length > 0 && (
                  <div className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Building2 className="h-4 w-4" />
                      Meeting Rooms ({meetingRooms.length})
                    </h4>
                    <div className="space-y-2">
                      {meetingRooms.map(room => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onEdit={handleEdit}
                          onDelete={id => deleteRoom.mutate({ id })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading Docks */}
                {loadingDocks.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Truck className="h-4 w-4" />
                      Loading Docks ({loadingDocks.length})
                    </h4>
                    <div className="space-y-2">
                      {loadingDocks.map(room => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onEdit={handleEdit}
                          onDelete={id => deleteRoom.mutate({ id })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {rooms.length === 0 && !showCreateForm && (
                  <div className="text-center text-gray-500 py-8">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No rooms configured yet</p>
                    <p className="text-sm mt-1">
                      Click "Add New Room" to get started
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={deleteFeatureConfirm !== null}
        onOpenChange={(open) => !open && setDeleteFeatureConfirm(null)}
        title="Remove Feature"
        description="Are you sure you want to remove this feature from the room?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteFeatureConfirm) {
            removeFeature(deleteFeatureConfirm);
          }
          setDeleteFeatureConfirm(null);
        }}
      />
    </div>
  );
}

interface RoomCardProps {
  room: {
    id: number;
    name: string;
    description: string | null;
    roomType: "meeting" | "loading";
    capacity: number | null;
    color: string;
    features: string[] | null;
  };
  onEdit: (room: RoomCardProps["room"]) => void;
  onDelete: (id: number) => void;
}

function RoomCard({ room, onEdit, onDelete }: RoomCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: room.color }}
        />
        <div>
          <div className="font-medium text-gray-900">{room.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {room.capacity && <span>Capacity: {room.capacity}</span>}
            {room.features && room.features.length > 0 && (
              <span>{room.features.join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(room)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onDelete(room.id);
                setConfirmDelete(false);
              }}
              className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg"
              title="Confirm Delete"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default RoomManagementModal;

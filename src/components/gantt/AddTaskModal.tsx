'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface NewTaskData {
  name: string;
  group: string;
  startAt: Date;
  endAt: Date;
  statusId: string;
}

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  groupNames: string[];
  onAddTask: (task: NewTaskData) => void;
}

export default function AddTaskModal({
  open,
  onOpenChange,
  defaultDate,
  groupNames,
  onAddTask,
}: AddTaskModalProps) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(groupNames[0] || '');
  const [startAt, setStartAt] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [endAt, setEndAt] = useState(format(addDays(defaultDate, 7), 'yyyy-MM-dd'));
  const [statusId, setStatusId] = useState('planned');

  // Sync dates when modal opens
  useEffect(() => {
    if (open) {
      setStartAt(format(defaultDate, 'yyyy-MM-dd'));
      setEndAt(format(addDays(defaultDate, 7), 'yyyy-MM-dd'));
    }
  }, [open, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onAddTask({
      name: name.trim(),
      group,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      statusId,
    });

    // Reset form
    setName('');
    setGroup(groupNames[0] ?? '');
    setStatusId('planned');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name</Label>
            <Input
              id="task-name"
              placeholder="Enter task name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-group">Group</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger id="task-group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groupNames.map((groupName) => (
                  <SelectItem key={groupName} value={groupName}>
                    {groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-status">Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger id="task-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

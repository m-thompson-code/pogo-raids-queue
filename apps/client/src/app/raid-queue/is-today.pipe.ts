import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'isToday', pure: true })
export class IsTodayPipe implements PipeTransform {
  transform(date: Date | null | undefined): boolean {
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  }
}

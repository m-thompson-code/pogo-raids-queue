import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UsersService, PAGE_SIZE, type RaidUser } from './users.service';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

type SortKey = keyof RaidUser;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-users',
  imports: [DatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  // Cursor history: index i holds the startAfter cursor for page i (null = no cursor = page 0)
  private cursors: (QueryDocumentSnapshot<DocumentData> | null)[] = [null];

  protected readonly users = signal<RaidUser[]>([]);
  protected readonly pageLoading = signal(true);
  protected readonly sortKey = signal<SortKey>('twitchUsername');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly page = signal(0);
  protected readonly totalUsers = signal(0);
  protected readonly pageCount = computed(() => Math.ceil(this.totalUsers() / PAGE_SIZE));

  ngOnInit(): void {
    this.usersService.getUserCount().subscribe((count) => this.totalUsers.set(count));
    this.loadPage();
  }

  private loadPage(): void {
    this.pageLoading.set(true);
    const cursor = this.cursors[this.page()] ?? null;
    this.usersService.getPage(this.sortKey(), this.sortDir(), cursor).subscribe({
      next: ({ users, lastDoc }) => {
        this.users.set(users);
        if (lastDoc) this.cursors[this.page() + 1] = lastDoc;
        this.pageLoading.set(false);
      },
      error: () => {
        this.pageLoading.set(false);
      },
    });
  }

  protected sort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(0);
    this.cursors = [null];
    this.loadPage();
  }

  protected prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.loadPage();
    }
  }

  protected nextPage(): void {
    if (this.page() < this.pageCount() - 1) {
      this.page.update((p) => p + 1);
      this.loadPage();
    }
  }
}


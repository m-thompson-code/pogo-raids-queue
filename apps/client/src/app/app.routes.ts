import { Route } from '@angular/router';
import { RaidQueueComponent } from './raid-queue/raid-queue.component';
import { UsersComponent } from './users/users.component';

export const appRoutes: Route[] = [
  { path: '', component: RaidQueueComponent },
  { path: 'users', component: UsersComponent },
];

import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { Auction } from '../../../models/auction';
import { StorageService } from '../../../services/storage.service';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  imports: [
    TableModule,
    Button,
    FormsModule,
    DropdownModule,
    DatePipe,
    CurrencyPipe,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  styles: [
    `
      :host ::ng-deep {
        .p-paginator {
          .p-paginator-current {
            margin-left: auto;
          }
        }

        .p-progressbar {
          height: 0.5rem;
          background-color: #d8dadc;

          .p-progressbar-value {
            background-color: #607d8b;
          }
        }

        .table-header {
          display: flex;
          justify-content: space-between;
        }

        .p-calendar .p-datepicker {
          min-width: 25rem;

          td {
            font-weight: 400;
          }
        }

        .p-datatable.p-datatable-customers {
          .p-datatable-header {
            padding: 1rem;
            text-align: left;
            font-size: 1.5rem;
          }

          .p-paginator {
            padding: 1rem;
          }

          .p-datatable-thead > tr > th {
            text-align: left;
          }

          .p-datatable-tbody > tr > td {
            cursor: auto;
          }

          .p-dropdown-label:not(.p-placeholder) {
            text-transform: uppercase;
          }
        }

        .p-w-100 {
          width: 100%;
        }

        /* Responsive */
        .p-datatable-customers .p-datatable-tbody > tr > td .p-column-title {
          display: none;
        }
      }

      @media screen and (max-width: 960px) {
        :host ::ng-deep {
          .p-datatable {
            &.p-datatable-customers {
              .p-datatable-thead > tr > th,
              .p-datatable-tfoot > tr > td {
                display: none !important;
              }

              .p-datatable-tbody > tr {
                border-bottom: 1px solid var(--layer-2);

                > td {
                  text-align: left;
                  width: 100%;
                  display: flex;
                  align-items: center;
                  border: 0 none;

                  .p-column-title {
                    min-width: 30%;
                    display: inline-block;
                    font-weight: bold;
                  }

                  p-progressbar {
                    width: 100%;
                  }

                  &:last-child {
                    border-bottom: 1px solid var(--surface-d);
                  }
                }
              }
            }
          }
        }
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  auctions!: Auction[];
  selectedAuctions!: Auction[];
  loading: boolean = true;

  constructor(private storageService: StorageService) {}

  ngOnInit() {
    this.fetchAuctions();
  }

  async fetchAuctions() {
    try {
      this.auctions = await this.storageService.loadAuctions();
      this.loading = false;
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
  }
}

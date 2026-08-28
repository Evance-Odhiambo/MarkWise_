import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class BleUnitMapping extends Model {
  static table = 'ble_unit_mappings';

  @field('user_id') userId!: string;
  @field('role') role!: string;
  @field('institution_id') institutionId!: string;
  @field('unit_code') unitCode!: string;
  @field('unit_name') unitName!: string | null;
  @field('ble_id') bleId!: string;
  @field('synced_at') syncedAt!: number;
}

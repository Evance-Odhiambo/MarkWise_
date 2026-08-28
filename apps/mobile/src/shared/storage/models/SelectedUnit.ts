import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class SelectedUnit extends Model {
  static table = 'selected_units';

  @field('user_id') userId!: string;
  @field('role') role!: string;
  @field('institution_id') institutionId!: string;
  @field('unit_code') unitCode!: string;
  @field('selected_at') selectedAt!: number;
}

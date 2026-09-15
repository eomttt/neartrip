import type { MessageKey } from '@/common/i18n/messages';
import type { CrowdingLevel } from '../models/model-crowding';
import type { Category } from '../models/model-trip';

export const categoryMessageKeys: Record<Category, MessageKey> = {
  restaurant: 'category.restaurant',
  cafe: 'category.cafe',
  attraction: 'category.attraction',
  bar: 'category.bar',
};

export const crowdingMessageKeys: Record<CrowdingLevel, MessageKey> = {
  여유: 'crowding.relaxed',
  보통: 'crowding.normal',
  '약간 붐빔': 'crowding.busy',
  붐빔: 'crowding.veryBusy',
};

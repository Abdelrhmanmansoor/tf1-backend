const Location = require('../models/Location');

const regions = [
  { code: '01', name_ar: 'الرياض', name_en: 'Riyadh', slug: 'riyadh' },
  { code: '02', name_ar: 'مكة المكرمة', name_en: 'Makkah', slug: 'makkah' },
  { code: '03', name_ar: 'المدينة المنورة', name_en: 'Madinah', slug: 'madinah' },
  { code: '04', name_ar: 'المنطقة الشرقية', name_en: 'Eastern Province', slug: 'eastern-province' },
  { code: '05', name_ar: 'القصيم', name_en: 'Al-Qassim', slug: 'al-qassim' },
  { code: '06', name_ar: 'عسير', name_en: 'Asir', slug: 'asir' },
  { code: '07', name_ar: 'حائل', name_en: 'Hail', slug: 'hail' },
  { code: '08', name_ar: 'تبوك', name_en: 'Tabuk', slug: 'tabuk' },
  { code: '09', name_ar: 'الجوف', name_en: 'Al-Jawf', slug: 'al-jawf' },
  { code: '10', name_ar: 'جازان', name_en: 'Jazan', slug: 'jazan' },
  { code: '11', name_ar: 'نجران', name_en: 'Najran', slug: 'najran' },
  { code: '12', name_ar: 'الباحة', name_en: 'Al-Baha', slug: 'al-baha' },
  { code: '13', name_ar: 'الحدود الشمالية', name_en: 'Northern Borders', slug: 'northern-borders' },
];

async function seedRegions() {
  try {
    const existingCountry = await Location.findOne({ level: 'country', code: 'SA' });
    let country;
    if (!existingCountry) {
      country = await Location.create({
        parent_id: null,
        level: 'country',
        code: 'SA',
        name_ar: 'المملكة العربية السعودية',
        name_en: 'Saudi Arabia',
        slug: 'saudi-arabia'
      });
    } else {
      country = existingCountry;
    }

    const count = await Location.countDocuments({ level: 'region', parent_id: country._id });
    if (count >= 13) {
      return { success: true, message: 'Regions already seeded' };
    }

    const toInsert = regions.map(r => ({
      parent_id: country._id,
      level: 'region',
      code: r.code,
      name_ar: r.name_ar,
      name_en: r.name_en,
      slug: r.slug
    }));

    await Location.insertMany(toInsert, { ordered: false });
    return { success: true, message: 'Regions seeded' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { seedRegions };

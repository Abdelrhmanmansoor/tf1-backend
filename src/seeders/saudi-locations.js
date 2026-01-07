const mongoose = require('mongoose');
require('dotenv').config();

const Location = require('../models/Location');

// Saudi Arabia Regions and Cities
const saudiLocations = [
  {
    level: 'country',
    code: 'SA',
    name_ar: 'المملكة العربية السعودية',
    name_en: 'Saudi Arabia',
    slug: 'saudi-arabia',
    children: [
      {
        level: 'region',
        code: 'RY',
        name_ar: 'منطقة الرياض',
        name_en: 'Riyadh Region',
        slug: 'riyadh-region',
        children: [
          {
            level: 'city',
            name_ar: 'الرياض',
            name_en: 'Riyadh',
            slug: 'riyadh',
            children: [
              { level: 'district', name_ar: 'العليا', name_en: 'Al Olaya', slug: 'riyadh-al-olaya' },
              { level: 'district', name_ar: 'الملقا', name_en: 'Al Malqa', slug: 'riyadh-al-malqa' },
              { level: 'district', name_ar: 'المروج', name_en: 'Al Muruj', slug: 'riyadh-al-muruj' },
              { level: 'district', name_ar: 'النرجس', name_en: 'Al Narjis', slug: 'riyadh-al-narjis' },
              { level: 'district', name_ar: 'الياسمين', name_en: 'Al Yasmin', slug: 'riyadh-al-yasmin' },
              { level: 'district', name_ar: 'الربيع', name_en: 'Al Rabie', slug: 'riyadh-al-rabie' },
              { level: 'district', name_ar: 'قرطبة', name_en: 'Qurtubah', slug: 'riyadh-qurtubah' },
              { level: 'district', name_ar: 'الملز', name_en: 'Al Malaz', slug: 'riyadh-al-malaz' },
            ]
          }
        ]
      },
      {
        level: 'region',
        code: 'MK',
        name_ar: 'منطقة مكة المكرمة',
        name_en: 'Makkah Region',
        slug: 'makkah-region',
        children: [
          {
            level: 'city',
            name_ar: 'مكة المكرمة',
            name_en: 'Makkah',
            slug: 'makkah',
            children: [
              { level: 'district', name_ar: 'العزيزية', name_en: 'Al Aziziyah', slug: 'makkah-al-aziziyah' },
              { level: 'district', name_ar: 'الشرائع', name_en: 'Ash Sharaie', slug: 'makkah-ash-sharaie' },
              { level: 'district', name_ar: 'العوالي', name_en: 'Al Awali', slug: 'makkah-al-awali' },
            ]
          },
          {
            level: 'city',
            name_ar: 'جدة',
            name_en: 'Jeddah',
            slug: 'jeddah',
            children: [
              { level: 'district', name_ar: 'الروضة', name_en: 'Al Rawdah', slug: 'jeddah-al-rawdah' },
              { level: 'district', name_ar: 'الحمراء', name_en: 'Al Hamra', slug: 'jeddah-al-hamra' },
              { level: 'district', name_ar: 'الشاطئ', name_en: 'Al Shati', slug: 'jeddah-al-shati' },
              { level: 'district', name_ar: 'النعيم', name_en: 'Al Naim', slug: 'jeddah-al-naim' },
              { level: 'district', name_ar: 'السلامة', name_en: 'Al Salamah', slug: 'jeddah-al-salamah' },
              { level: 'district', name_ar: 'الفيصلية', name_en: 'Al Faisaliyah', slug: 'jeddah-al-faisaliyah' },
            ]
          },
          {
            level: 'city',
            name_ar: 'الطائف',
            name_en: 'Taif',
            slug: 'taif',
            children: [
              { level: 'district', name_ar: 'الحويه', name_en: 'Al Huwayah', slug: 'taif-al-huwayah' },
              { level: 'district', name_ar: 'الشفا', name_en: 'Al Shafa', slug: 'taif-al-shafa' },
            ]
          }
        ]
      },
      {
        level: 'region',
        code: 'MD',
        name_ar: 'المنطقة المدينة المنورة',
        name_en: 'Madinah Region',
        slug: 'madinah-region',
        children: [
          {
            level: 'city',
            name_ar: 'المدينة المنورة',
            name_en: 'Madinah',
            slug: 'madinah',
            children: [
              { level: 'district', name_ar: 'العزيزية', name_en: 'Al Aziziyah', slug: 'madinah-al-aziziyah' },
              { level: 'district', name_ar: 'قباء', name_en: 'Quba', slug: 'madinah-quba' },
            ]
          },
          {
            level: 'city',
            name_ar: 'ينبع',
            name_en: 'Yanbu',
            slug: 'yanbu'
          }
        ]
      },
      {
        level: 'region',
        code: 'EP',
        name_ar: 'المنطقة الشرقية',
        name_en: 'Eastern Province',
        slug: 'eastern-province',
        children: [
          {
            level: 'city',
            name_ar: 'الدمام',
            name_en: 'Dammam',
            slug: 'dammam',
            children: [
              { level: 'district', name_ar: 'الفيصلية', name_en: 'Al Faisaliyah', slug: 'dammam-al-faisaliyah' },
              { level: 'district', name_ar: 'الشاطئ', name_en: 'Al Shati', slug: 'dammam-al-shati' },
            ]
          },
          {
            level: 'city',
            name_ar: 'الخبر',
            name_en: 'Khobar',
            slug: 'khobar',
            children: [
              { level: 'district', name_ar: 'الكورنيش', name_en: 'Al Corniche', slug: 'khobar-al-corniche' },
              { level: 'district', name_ar: 'الثقبة', name_en: 'Al Thuqbah', slug: 'khobar-al-thuqbah' },
            ]
          },
          {
            level: 'city',
            name_ar: 'الظهران',
            name_en: 'Dhahran',
            slug: 'dhahran'
          },
          {
            level: 'city',
            name_ar: 'الأحساء',
            name_en: 'Al Ahsa',
            slug: 'al-ahsa'
          },
          {
            level: 'city',
            name_ar: 'الجبيل',
            name_en: 'Jubail',
            slug: 'jubail'
          }
        ]
      },
      {
        level: 'region',
        code: 'AS',
        name_ar: 'منطقة عسير',
        name_en: 'Asir Region',
        slug: 'asir-region',
        children: [
          {
            level: 'city',
            name_ar: 'أبها',
            name_en: 'Abha',
            slug: 'abha'
          },
          {
            level: 'city',
            name_ar: 'خميس مشيط',
            name_en: 'Khamis Mushait',
            slug: 'khamis-mushait'
          }
        ]
      },
      {
        level: 'region',
        code: 'TB',
        name_ar: 'منطقة تبوك',
        name_en: 'Tabuk Region',
        slug: 'tabuk-region',
        children: [
          {
            level: 'city',
            name_ar: 'تبوك',
            name_en: 'Tabuk',
            slug: 'tabuk'
          }
        ]
      },
      {
        level: 'region',
        code: 'QL',
        name_ar: 'منطقة القصيم',
        name_en: 'Qassim Region',
        slug: 'qassim-region',
        children: [
          {
            level: 'city',
            name_ar: 'بريدة',
            name_en: 'Buraidah',
            slug: 'buraidah'
          },
          {
            level: 'city',
            name_ar: 'عنيزة',
            name_en: 'Unaizah',
            slug: 'unaizah'
          }
        ]
      },
      {
        level: 'region',
        code: 'HA',
        name_ar: 'منطقة حائل',
        name_en: 'Hail Region',
        slug: 'hail-region',
        children: [
          {
            level: 'city',
            name_ar: 'حائل',
            name_en: 'Hail',
            slug: 'hail'
          }
        ]
      },
      {
        level: 'region',
        code: 'NB',
        name_ar: 'منطقة الحدود الشمالية',
        name_en: 'Northern Borders Region',
        slug: 'northern-borders-region',
        children: [
          {
            level: 'city',
            name_ar: 'عرعر',
            name_en: 'Arar',
            slug: 'arar'
          }
        ]
      },
      {
        level: 'region',
        code: 'JZ',
        name_ar: 'منطقة جازان',
        name_en: 'Jazan Region',
        slug: 'jazan-region',
        children: [
          {
            level: 'city',
            name_ar: 'جازان',
            name_en: 'Jazan',
            slug: 'jazan'
          }
        ]
      },
      {
        level: 'region',
        code: 'NJ',
        name_ar: 'منطقة نجران',
        name_en: 'Najran Region',
        slug: 'najran-region',
        children: [
          {
            level: 'city',
            name_ar: 'نجران',
            name_en: 'Najran',
            slug: 'najran'
          }
        ]
      },
      {
        level: 'region',
        code: 'BA',
        name_ar: 'منطقة الباحة',
        name_en: 'Bahah Region',
        slug: 'bahah-region',
        children: [
          {
            level: 'city',
            name_ar: 'الباحة',
            name_en: 'Bahah',
            slug: 'bahah'
          }
        ]
      },
      {
        level: 'region',
        code: 'JF',
        name_ar: 'منطقة الجوف',
        name_en: 'Al Jouf Region',
        slug: 'al-jouf-region',
        children: [
          {
            level: 'city',
            name_ar: 'سكاكا',
            name_en: 'Sakaka',
            slug: 'sakaka'
          }
        ]
      }
    ]
  }
];

async function seedLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform');
    console.log('✓ Connected to MongoDB');

    // Clear existing locations
    await Location.deleteMany({});
    console.log('✓ Cleared existing locations');

    let created = 0;

    // Insert locations recursively
    async function insertLocations(locations, parentId = null) {
      for (const loc of locations) {
        const { children, ...locationData } = loc;
        
        const location = await Location.create({
          ...locationData,
          parent_id: parentId
        });
        
        created++;
        console.log(`  → Created: ${location.name_ar} (${location.level})`);

        if (children && children.length > 0) {
          await insertLocations(children, location._id);
        }
      }
    }

    await insertLocations(saudiLocations);

    console.log(`\n✅ Successfully seeded ${created} locations!`);
    
    // Print summary
    const counts = await Promise.all([
      Location.countDocuments({ level: 'country' }),
      Location.countDocuments({ level: 'region' }),
      Location.countDocuments({ level: 'city' }),
      Location.countDocuments({ level: 'district' })
    ]);

    console.log('\n📊 Summary:');
    console.log(`   Countries: ${counts[0]}`);
    console.log(`   Regions: ${counts[1]}`);
    console.log(`   Cities: ${counts[2]}`);
    console.log(`   Districts: ${counts[3]}`);
    console.log(`   Total: ${created}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding locations:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedLocations();
}

module.exports = { seedLocations, saudiLocations };


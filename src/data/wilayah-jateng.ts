/**
 * Data wilayah Provinsi Jawa Tengah
 * Sumber: Kemendagri / BPS — 35 kabupaten/kota, kecamatan per wilayah
 * ponytail: static file, no DB join needed — upgrade to Kemendagri API if list grows
 */

export interface KabupatenKota {
  id: string
  nama: string
  tipe: 'kabupaten' | 'kota'
  kecamatan: string[]
}

export const WILAYAH_JATENG: KabupatenKota[] = [
  {
    id: 'kota-semarang',
    nama: 'Kota Semarang',
    tipe: 'kota',
    kecamatan: [
      'Banyumanik', 'Candisari', 'Gajah Mungkur', 'Gayamsari', 'Genuk',
      'Gunungpati', 'Mijen', 'Ngaliyan', 'Pedurungan', 'Semarang Barat',
      'Semarang Selatan', 'Semarang Tengah', 'Semarang Timur', 'Semarang Utara',
      'Tembalang', 'Tugu',
    ],
  },
  {
    id: 'kab-semarang',
    nama: 'Kabupaten Semarang',
    tipe: 'kabupaten',
    kecamatan: [
      'Ambarawa', 'Bancak', 'Bandungan', 'Banyubiru', 'Bawen',
      'Bergas', 'Bringin', 'Getasan', 'Jambu', 'Kaliwungu',
      'Pabelan', 'Pringapus', 'Suruh', 'Susukan', 'Tengaran',
      'Tuntang', 'Ungaran Barat', 'Ungaran Timur',
    ],
  },
  {
    id: 'kota-surakarta',
    nama: 'Kota Surakarta',
    tipe: 'kota',
    kecamatan: [
      'Banjarsari', 'Jebres', 'Laweyan', 'Pasar Kliwon', 'Serengan',
    ],
  },
  {
    id: 'kab-karanganyar',
    nama: 'Kabupaten Karanganyar',
    tipe: 'kabupaten',
    kecamatan: [
      'Colomadu', 'Gondangrejo', 'Jaten', 'Jatipuro', 'Jatiyoso',
      'Jenawi', 'Jumantono', 'Jumapolo', 'Karanganyar', 'Karangpandan',
      'Kebakkramat', 'Kerjo', 'Matesih', 'Mojogedang', 'Ngargoyoso',
      'Tasikmadu', 'Tawangmangu',
    ],
  },
  {
    id: 'kab-boyolali',
    nama: 'Kabupaten Boyolali',
    tipe: 'kabupaten',
    kecamatan: [
      'Ampel', 'Andong', 'Banyudono', 'Boyolali', 'Cepogo',
      'Karanggede', 'Kemusu', 'Klego', 'Mojosongo', 'Musuk',
      'Ngemplak', 'Nogosari', 'Sambi', 'Sawit', 'Selo',
      'Simo', 'Teras', 'Wonosegoro',
    ],
  },
  {
    id: 'kab-klaten',
    nama: 'Kabupaten Klaten',
    tipe: 'kabupaten',
    kecamatan: [
      'Bayat', 'Cawas', 'Ceper', 'Delanggu', 'Gantiwarno',
      'Jatinom', 'Jogonalan', 'Juwiring', 'Kalikotes', 'Karanganom',
      'Karangdowo', 'Karangnongko', 'Kebonarum', 'Kemalang', 'Klaten Selatan',
      'Klaten Tengah', 'Klaten Utara', 'Manisrenggo', 'Ngawen', 'Pedan',
      'Polanharjo', 'Prambanan', 'Trucuk', 'Tulung', 'Wedi', 'Wonosari',
    ],
  },
  {
    id: 'kota-magelang',
    nama: 'Kota Magelang',
    tipe: 'kota',
    kecamatan: ['Magelang Selatan', 'Magelang Tengah', 'Magelang Utara'],
  },
  {
    id: 'kab-magelang',
    nama: 'Kabupaten Magelang',
    tipe: 'kabupaten',
    kecamatan: [
      'Bandongan', 'Borobudur', 'Candimulyo', 'Dukun', 'Grabag',
      'Kajoran', 'Kaliangkrik', 'Mertoyudan', 'Mungkid', 'Muntilan',
      'Ngablak', 'Ngluwar', 'Pakis', 'Salaman', 'Salam',
      'Sawangan', 'Secang', 'Srumbung', 'Tempuran', 'Tegalrejo',
      'Windusari',
    ],
  },
  {
    id: 'kab-purworejo',
    nama: 'Kabupaten Purworejo',
    tipe: 'kabupaten',
    kecamatan: [
      'Bagelen', 'Banyuurip', 'Bayan', 'Bruno', 'Butuh',
      'Gebang', 'Grabag', 'Kaligesing', 'Kemiri', 'Kutoarjo',
      'Loano', 'Ngombol', 'Pituruh', 'Purworejo', 'Purwodadi',
    ],
  },
  {
    id: 'kab-kebumen',
    nama: 'Kabupaten Kebumen',
    tipe: 'kabupaten',
    kecamatan: [
      'Adimulyo', 'Alian', 'Ambal', 'Ayah', 'Bonorowo',
      'Buayan', 'Buluspesantren', 'Gombong', 'Karanggayam', 'Karangsambung',
      'Kebumen', 'Klirong', 'Kuwarasan', 'Kutowinangun', 'Mirit',
      'Padureso', 'Pejagoan', 'Petanahan', 'Poncowarno', 'Prembun',
      'Rowokele', 'Sadang', 'Sempor', 'Sruweng',
    ],
  },
  {
    id: 'kota-salatiga',
    nama: 'Kota Salatiga',
    tipe: 'kota',
    kecamatan: ['Argomulyo', 'Sidomukti', 'Sidorejo', 'Tingkir'],
  },
  {
    id: 'kab-demak',
    nama: 'Kabupaten Demak',
    tipe: 'kabupaten',
    kecamatan: [
      'Bonang', 'Demak', 'Dempet', 'Gajah', 'Guntur',
      'Karangawen', 'Karanganyar', 'Karangtenah', 'Kebonagung', 'Mijen',
      'Mranggen', 'Sayung', 'Wedung', 'Wonosalam',
    ],
  },
  {
    id: 'kab-kendal',
    nama: 'Kabupaten Kendal',
    tipe: 'kabupaten',
    kecamatan: [
      'Boja', 'Brangsong', 'Cepiring', 'Gemuh', 'Kaliwungu',
      'Kaliwungu Selatan', 'Kangkung', 'Kendal', 'Limbangan', 'Ngampel',
      'Pageruyung', 'Patean', 'Pegandon', 'Plantungan', 'Rininarjo',
      'Rowosari', 'Singorojo', 'Sukorejo', 'Weleri',
    ],
  },
  {
    id: 'kab-batang',
    nama: 'Kabupaten Batang',
    tipe: 'kabupaten',
    kecamatan: [
      'Ampelgading', 'Bandar', 'Batang', 'Bawang', 'Blado',
      'Gringsing', 'Kandeman', 'Limpung', 'Pecalungan', 'Reban',
      'Subah', 'Tersono', 'Tulis', 'Warungasem', 'Wonotunggal',
    ],
  },
  {
    id: 'kab-pekalongan',
    nama: 'Kabupaten Pekalongan',
    tipe: 'kabupaten',
    kecamatan: [
      'Bojong', 'Buaran', 'Doro', 'Kandangserang', 'Karanganyar',
      'Karangdadap', 'Kajen', 'Kesesi', 'Lebakbarang', 'Paninggaran',
      'Petungkriyono', 'Siwalan', 'Sragi', 'Talun', 'Tirto',
      'Wonokerto', 'Wonopringgo',
    ],
  },
  {
    id: 'kota-pekalongan',
    nama: 'Kota Pekalongan',
    tipe: 'kota',
    kecamatan: ['Pekalongan Barat', 'Pekalongan Selatan', 'Pekalongan Timur', 'Pekalongan Utara'],
  },
  {
    id: 'kab-pemalang',
    nama: 'Kabupaten Pemalang',
    tipe: 'kabupaten',
    kecamatan: [
      'Ampelgading', 'Bantarbolang', 'Belik', 'Bodeh', 'Comal',
      'Moga', 'Pemalang', 'Petarukan', 'Pulosari', 'Randudongkal',
      'Taman', 'Ulujami', 'Warungpring',
    ],
  },
  {
    id: 'kab-tegal',
    nama: 'Kabupaten Tegal',
    tipe: 'kabupaten',
    kecamatan: [
      'Adiwerna', 'Balapulang', 'Bojong', 'Bumijawa', 'Dukuhturi',
      'Dukuhwaru', 'Jatinegara', 'Kedungbanteng', 'Kramat', 'Lebaksiu',
      'Margasari', 'Pagerbarang', 'Pangkah', 'Slawi', 'Surodadi',
      'Talang', 'Tarub', 'Tonjong', 'Warureja',
    ],
  },
  {
    id: 'kota-tegal',
    nama: 'Kota Tegal',
    tipe: 'kota',
    kecamatan: ['Margadana', 'Tegal Barat', 'Tegal Selatan', 'Tegal Timur'],
  },
  {
    id: 'kab-brebes',
    nama: 'Kabupaten Brebes',
    tipe: 'kabupaten',
    kecamatan: [
      'Banjarharjo', 'Bantarkawung', 'Brebes', 'Bulakamba', 'Bumiayu',
      'Jatibarang', 'Kersana', 'Ketanggungan', 'Larangan', 'Losari',
      'Paguyangan', 'Salem', 'Songgom', 'Tanjung', 'Tonjong',
      'Wanasari',
    ],
  },
  {
    id: 'kab-cilacap',
    nama: 'Kabupaten Cilacap',
    tipe: 'kabupaten',
    kecamatan: [
      'Adipala', 'Bantarsari', 'Binangun', 'Cilacap Selatan', 'Cilacap Tengah',
      'Cilacap Utara', 'Cipari', 'Cimanggu', 'Dayeuhluhur', 'Gandrungmangu',
      'Jeruklegi', 'Kampung Laut', 'Karangpucung', 'Kawunganten', 'Kedungreja',
      'Kesugihan', 'Kroya', 'Majenang', 'Maos', 'Nusawungu',
      'Patimuan', 'Sampang', 'Sidareja', 'Wanareja',
    ],
  },
  {
    id: 'kab-banyumas',
    nama: 'Kabupaten Banyumas',
    tipe: 'kabupaten',
    kecamatan: [
      'Ajibarang', 'Banyumas', 'Baturraden', 'Cilongok', 'Gumelar',
      'Jatilawang', 'Kalibagor', 'Karanglewas', 'Kebasen', 'Kemranjen',
      'Kembaran', 'Lumbir', 'Patikraja', 'Pekuncen', 'Purwojati',
      'Purwokerto Barat', 'Purwokerto Selatan', 'Purwokerto Timur', 'Purwokerto Utara',
      'Rawalo', 'Sokaraja', 'Somagede', 'Sumbang', 'Sumpiuh',
      'Tambak', 'Wangon',
    ],
  },
  {
    id: 'kab-purbalingga',
    nama: 'Kabupaten Purbalingga',
    tipe: 'kabupaten',
    kecamatan: [
      'Bobotsari', 'Bojongsari', 'Bukateja', 'Kaligondang', 'Kalimanah',
      'Karangjambu', 'Karangmoncol', 'Karangtengah', 'Kemangkon', 'Kutasari',
      'Mrebet', 'Padamara', 'Pengadegan', 'Purbalingga', 'Rembang',
      'Serayu Larangan',
    ],
  },
  {
    id: 'kab-banjarnegara',
    nama: 'Kabupaten Banjarnegara',
    tipe: 'kabupaten',
    kecamatan: [
      'Banjarmangu', 'Banjarnegara', 'Batur', 'Bawang', 'Banjarnegara',
      'Kalibening', 'Karangkobar', 'Madukara', 'Mandiraja', 'Pagentan',
      'Pagedongan', 'Pejawaran', 'Purwanegara', 'Rakit', 'Sigaluh',
      'Susukan', 'Wanayasa', 'Wanadadi',
    ],
  },
  {
    id: 'kab-wonosobo',
    nama: 'Kabupaten Wonosobo',
    tipe: 'kabupaten',
    kecamatan: [
      'Garung', 'Kalibawang', 'Kaliwiro', 'Kejajar', 'Kepil',
      'Kalikajar', 'Leksono', 'Mojotengah', 'Sapuran', 'Selomerto',
      'Sukoharjo', 'Wadaslintang', 'Watumalang', 'Wonosobo',
    ],
  },
  {
    id: 'kab-temanggung',
    nama: 'Kabupaten Temanggung',
    tipe: 'kabupaten',
    kecamatan: [
      'Bejen', 'Bulu', 'Candiroto', 'Gemawang', 'Jumo',
      'Kaloran', 'Kandangan', 'Kedu', 'Kledung', 'Kranggan',
      'Ngadirejo', 'Parakan', 'Pringsurat', 'Selopampang', 'Temanggung',
      'Tembarak', 'Tlogomulyo', 'Tretep', 'Wonoboyo',
    ],
  },
  {
    id: 'kab-kudus',
    nama: 'Kabupaten Kudus',
    tipe: 'kabupaten',
    kecamatan: [
      'Bae', 'Dawe', 'Gebog', 'Jati', 'Jekulo',
      'Kaliwungu', 'Kota Kudus', 'Mejobo', 'Undaan',
    ],
  },
  {
    id: 'kab-jepara',
    nama: 'Kabupaten Jepara',
    tipe: 'kabupaten',
    kecamatan: [
      'Bangsri', 'Batealit', 'Donorojo', 'Gedong', 'Jepara',
      'Kalinyamatan', 'Karimunjawa', 'Kedung', 'Keling', 'Kembang',
      'Mayong', 'Mlonggo', 'Nalumsari', 'Pakis Aji', 'Pecangaan',
      'Tahunan', 'Welahan',
    ],
  },
  {
    id: 'kab-pati',
    nama: 'Kabupaten Pati',
    tipe: 'kabupaten',
    kecamatan: [
      'Batangan', 'Cluwak', 'Dukuhseti', 'Gembong', 'Gunungwungkal',
      'Jaken', 'Jakenan', 'Juwana', 'Kayen', 'Margorejo',
      'Margoyoso', 'Pati', 'Pucakwangi', 'Sukolilo', 'Tambakromo',
      'Tlogowungu', 'Trangkil', 'Wedarijaksa', 'Winong', 'Gabus',
    ],
  },
  {
    id: 'kab-rembang',
    nama: 'Kabupaten Rembang',
    tipe: 'kabupaten',
    kecamatan: [
      'Bulu', 'Gunem', 'Kaliori', 'Kragan', 'Lasem',
      'Pamotan', 'Pancur', 'Rembang', 'Sale', 'Sarang',
      'Sedan', 'Sluke', 'Sulang', 'Sumber',
    ],
  },
  {
    id: 'kab-blora',
    nama: 'Kabupaten Blora',
    tipe: 'kabupaten',
    kecamatan: [
      'Banjarejo', 'Blora', 'Bogorejo', 'Cepu', 'Japah',
      'Jati', 'Jepon', 'Jiken', 'Kedungtuban', 'Kunduran',
      'Ngawen', 'Randublatung', 'Sambong', 'Todanan', 'Tunjungan',
    ],
  },
  {
    id: 'kab-grobogan',
    nama: 'Kabupaten Grobogan',
    tipe: 'kabupaten',
    kecamatan: [
      'Brati', 'Gabus', 'Geyer', 'Godong', 'Grobogan',
      'Gubug', 'Karangrayung', 'Kedungjati', 'Klambu', 'Kradenan',
      'Ngaringan', 'Penawangan', 'Pulokulon', 'Purwodadi', 'Rowosari',
      'Tanggungharjo', 'Tawangharjo', 'Tegowanu', 'Toroh', 'Wirosari',
    ],
  },
  {
    id: 'kab-wonogiri',
    nama: 'Kabupaten Wonogiri',
    tipe: 'kabupaten',
    kecamatan: [
      'Baturetno', 'Batuwarno', 'Bulukerto', 'Eromoko', 'Girimarto',
      'Giritontro', 'Giriwoyo', 'Jatipurno', 'Jatiroto', 'Jatisrono',
      'Karangtengah', 'Kismantoro', 'Manyaran', 'Ngadirojo', 'Nguntoronadi',
      'Pracimantoro', 'Puhpelem', 'Purwantoro', 'Ronggojati', 'Selogiri',
      'Sidoharjo', 'Tirtomoyo', 'Wonogiri', 'Wuryantoro',
    ],
  },
  {
    id: 'kab-sukoharjo',
    nama: 'Kabupaten Sukoharjo',
    tipe: 'kabupaten',
    kecamatan: [
      'Baki', 'Bendosari', 'Bulu', 'Gatak', 'Grogol',
      'Kartasura', 'Mojolaban', 'Nguter', 'Polokarto', 'Sukoharjo',
      'Tawangsari', 'Weru',
    ],
  },
  {
    id: 'kab-sragen',
    nama: 'Kabupaten Sragen',
    tipe: 'kabupaten',
    kecamatan: [
      'Gemolong', 'Gondang', 'Jenar', 'Kalijambe', 'Karangmalang',
      'Kedawung', 'Masaran', 'Miri', 'Mondokan', 'Ngrampal',
      'Plupuh', 'Sambirejo', 'Sambungmacan', 'Sidoharjo', 'Sragen',
      'Sukodono', 'Sumberlawang', 'Tangen', 'Tanon',
    ],
  },
]

/** Helper: get kecamatan list by kabupatenId */
export function getKecamatan(kabupatenId: string): string[] {
  return WILAYAH_JATENG.find((k) => k.id === kabupatenId)?.kecamatan ?? []
}

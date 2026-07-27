import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faPhone,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons'

const NAV_LINKS = [
  { label: 'Home',            href: '/dashboard' },
  { label: 'About Programs',  href: '/programs' },
  { label: 'FAQ',             href: '/faq' },
  { label: 'Announcements',   href: '/announcements' },
  { label: 'Contact',         href: '/contact' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Kolom 1 — Brand */}
          <div className="flex flex-col gap-4">
            <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1 rounded-xl border border-white/20 bg-white p-2 shadow-lg shadow-black/10"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                src="/logo/logo-kota.png"
                alt="Logo Kota"
                className="h-10 w-auto object-contain"
                />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                src="/logo/kecamatan-berdaya.png"
                alt="Klas Berdaya"
                className="h-10 w-auto object-contain translate-y-[1px]"
                />
            </Link>

                <p className="max-w-xs text-sm leading-relaxed text-gray-400">
                    Platform klasifikasi indeks desa untuk mendukung pemberdayaan dan
                    perkembangan desa di wilayah Semarang.
                </p>
            </div>

          {/* Kolom 2 — Navigasi */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navigasi
            </h3>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3 — Kontak */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Kontak
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <FontAwesomeIcon icon={faLocationDot} className="mt-1 w-4 shrink-0 text-gray-500" />
                <span>Jl. Pemuda No. 148, Semarang, Jawa Tengah 50132</span>
              </li>
              <li className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPhone} className="w-4 shrink-0 text-gray-500" />
                <span>(024) 1234-5678</span>
              </li>
              <li className="flex items-center gap-2">
                <FontAwesomeIcon icon={faEnvelope} className="w-4 shrink-0 text-gray-500" />
                <a
                  href="mailto:info@klasberdaya.id"
                  className="hover:text-white transition-colors"
                >
                  info@klasberdaya.id
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {year} Klas Berdaya. Seluruh hak cipta dilindungi.</span>
          <span>Klasifikasi Indeks Desa Wilayah Semarang</span>
        </div>
      </div>
    </footer>
  )
}

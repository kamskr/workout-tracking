"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Logo from "./common/Logo";

const navigation = [
  { name: "Features", href: "#Benefits" },
  { name: "Community", href: "#reviews" },
] as const;

export default function Header() {
  return (
    <Disclosure as="nav" data-ui="public-header">
      {({ open }) => (
        <>
          <div className="flex h-16 items-center bg-white sm:h-20">
            <div className="container px-2 sm:px-0">
              <div className="relative flex h-16 items-center justify-between">
                <div className="flex shrink-0 items-center sm:hidden">
                  <Logo isMobile />
                </div>
                <div className="hidden shrink-0 items-center sm:flex">
                  <Logo />
                </div>

                <div className="flex flex-1 items-center justify-center">
                  <div className="hidden sm:block">
                    <ul className="flex space-x-28">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className="text-center text-xl font-normal leading-[normal] text-[#2D2D2D]"
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="hidden items-center gap-6 pr-2 sm:static sm:inset-auto sm:ml-6 sm:flex sm:pr-0">
                  <Link
                    href="/sign-in"
                    className="rounded-lg border border-solid border-[#2D2D2D] px-[22px] py-2.5 text-center font-montserrat text-xl font-normal leading-[normal] text-[#2D2D2D]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="button px-[22px] py-[11px] text-center font-montserrat text-xl font-normal leading-[normal] text-white"
                  >
                    Start tracking
                  </Link>
                </div>

                <div className="block sm:hidden">
                  <DisclosureButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </DisclosureButton>
                </div>
              </div>
            </div>
          </div>

          <DisclosurePanel className="sm:hidden">
            <div className="flex flex-col items-start gap-3 space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className="text-center text-xl font-normal leading-[normal] text-[#2D2D2D]"
                >
                  {item.name}
                </DisclosureButton>
              ))}
              <div className="flex items-center gap-6 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <Link
                  href="/sign-in"
                  className="rounded-lg border border-solid border-[#2D2D2D] px-5 py-[5px] text-center font-montserrat text-xl font-normal leading-[normal] text-[#2D2D2D]"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="button px-5 py-1.5 text-center font-montserrat text-xl font-normal leading-[normal] text-white"
                >
                  Start tracking
                </Link>
              </div>
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}

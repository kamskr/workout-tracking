"use client";

import { useClerk } from "@clerk/clerk-react";
import { Dumbbell, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export function UserNav({
  image,
  name,
  email,
}: {
  image: string;
  name: string;
  email: string;
}) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/65 bg-white/78 shadow-[0_10px_22px_rgba(81,37,13,0.08)] hover:bg-white">
          <Avatar className="h-10 w-10">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback>
              <img src="/images/profile.png" alt={name} />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-2xl border-white/60 bg-white/95 shadow-[0_24px_48px_rgba(73,33,11,0.12)]" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-black">{name}</p>
            <p className="text-xs leading-none text-black">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile/setup">
          <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-orange-50 focus:bg-orange-50">
            <UserIcon className="mr-2 h-4 w-4 text-black" />
            <span className="text-black">Profile</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/workouts">
          <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-orange-50 focus:bg-orange-50">
            <Dumbbell className="mr-2 h-4 w-4 text-black" />
            <span className="text-black">My workouts</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer rounded-xl hover:bg-orange-50 focus:bg-orange-50"
        >
          <LogOut className="mr-2 h-4 w-4 text-black" />
          <span className="text-black">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

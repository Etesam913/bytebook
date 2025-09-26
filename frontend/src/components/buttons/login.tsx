import { useMutation } from '@tanstack/react-query';
import { Browser } from '@wailsio/runtime';
import { motion } from 'motion/react';
import { useAtom } from 'jotai/react';
import { useRef, useState, useId } from 'react';
import { toast } from 'sonner';
import { userDataAtomWithLocalStorage } from '../../atoms';
import { useOnClickOutside } from '../../hooks/general';
import { ArrowDoorIn } from '../../icons/arrow-door-in';
import ArrowDoorOut from '../../icons/arrow-door-out';
import { ChevronDown } from '../../icons/chevron-down';
import { DEFAULT_SONNER_OPTIONS } from '../../utils/general';
import { DropdownItems } from '../dropdown/dropdown-items';

export function LoginButton() {
  const [userData, setUserData] = useAtom(userDataAtomWithLocalStorage);

  const [isUserOptionsOpen, setIsUserOptionsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(dropdownContainerRef, () => setIsUserOptionsOpen(false));
  
  const uniqueId = useId();
  const buttonId = `user-menu-button-${uniqueId}`;
  const menuId = `user-menu-${uniqueId}`;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8000/auth/github/logout', {
        method: 'DELETE',
        body: JSON.stringify({
          access_token: localStorage.getItem('accessToken'),
        }),
      });
      if (!res.ok) throw new Error('Logout Failed');
      return res;
    },
    onSuccess: () => {
      setUserData({
        accessToken: null,
        login: '',
        avatarUrl: '',
        email: '',
      });
    },
    onError: () => {
      toast.error('Logout Failed', DEFAULT_SONNER_OPTIONS);
    },
  });

  if (userData?.accessToken) {
    return (
      <div
        className="relative flex flex-col-reverse"
        ref={dropdownContainerRef}
      >
        <DropdownItems
          className="translate-y-[-3.25rem]"
          isOpen={isUserOptionsOpen}
          setIsOpen={setIsUserOptionsOpen}
          setFocusIndex={setFocusIndex}
          onChange={async ({ value }) => {
            if (value === 'log-out') {
              logoutMutation.mutate();
            }
          }}
          focusIndex={focusIndex}
          items={[
            {
              value: 'log-out',
              label: (
                <span className="flex items-center gap-1.5 will-change-transform">
                  <ArrowDoorOut /> Log Out
                </span>
              ),
            },
          ]}
          menuId={menuId}
          buttonId={buttonId}
          valueIndex={0}
        />

        <button
          id={buttonId}
          onClick={() => setIsUserOptionsOpen((prev) => !prev)}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isUserOptionsOpen}
          aria-controls={isUserOptionsOpen ? menuId : undefined}
          aria-label={`User menu for ${userData.login}`}
          className="w-full text-left text-sm bg-transparent text-ellipsis rounded-md flex items-center gap-1.5  hover:bg-zinc-100 dark:hover:bg-zinc-650 py-1 px-1.5 transition-colors"
        >
          <img
            src={userData.avatarUrl}
            alt="avatar"
            className="h-8 w-8 rounded-full"
          />
          <div className="flex flex-col overflow-x-hidden">
            <span>{userData.login}</span>

            <p className="text-zinc-500 dark:text-zinc-300 text-xs overflow-hidden text-ellipsis  ">
              {userData.email}
            </p>
          </div>
          <motion.div
            initial={{ rotate: 0 }}
            className="ml-auto"
            animate={{ rotate: isUserOptionsOpen ? 0 : 180 }}
            aria-hidden="true"
          >
            <ChevronDown
              className="min-w-[0.65rem] min-h-[0.65rem] text-zinc-500 dark:text-zinc-300 will-change-transform"
              strokeWidth="3.5px"
              width={10.4}
              height={10.4}
            />
          </motion.div>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full bg-transparent rounded-md flex gap-2 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 py-1 px-1.5 transition-colors"
      onClick={() => {
        Browser.OpenURL('http://localhost:8000/auth/github/login');
      }}
    >
      <ArrowDoorIn width={20} height={20} />
      <span>Login To GitHub</span>
    </button>
  );
}

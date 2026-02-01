(standard email) true simple@example.com
(multiple domain levels) true user.name@domain.co.uk
(plus tagging) true user+mailbox@gmail.com
(numeric local part) true 123456@provider.net
(hyphenated and long TLD) true customer-service@store.online
(consecutive dots in local part) false example..test@domain.com
(starts with a dot) false .user@domain.com
(ends with a dot) false user.@domain.com
(consecutive dots in domain) false user@domain..com
(TLD too short) false user@domain.c
(TLD cannot be numeric) false user@domain.123
(contains space) false user @domain.com
(missing local part) false @domain.com
(missing TLD) false user@domain
(domain starts with a dot) false user@.com
(contains invalid character #) false user#name@domain.com
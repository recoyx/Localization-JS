import LanguageTags from 'language-tags';
import { EventTarget } from 'event-target-shim';

/**
 * Localization object used mainly for loading and translating messages.
 * 
 * **Message assets**
 * 
 * Message assets are provided as JSON. Messages support the following special character sequences:
 *
 * - `$arg`
 * - `$$` (translates to a single `$`)
 * 
 * **Additional formatting options**
 * 
 * Special formatting such as date-time and relative-time is done with
 * the ECMAScript [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) namespace.
 * As a facility it is possible to get a sequence with the current locale together with its fallbacks via the
 * `localization.currentLocaleSeq` property.
 * 
 */
export class MsgLocalization extends EventTarget {
    constructor(options?: LocalizationOptions | null);

    readonly supportedLocales: Set<Locale>;

    supportsLocale(arg: Locale): boolean;

    readonly currentLocale: Locale | null;

    readonly currentLocaleSeq: Locale[];

    readonly currentLocaleSeqStr: string[];

    /**
     * Attempts to load a locale. The method returns `false` and keeps the property `currentLocale` intact if it fails loading messages,
     * The method returns `true`, updates the `currentLocale` property and dispatches a `localeload` event if it succeeds loading messages.
     * If the specified locale argument refers to the current loaded locale,
     * the method will not reload the locale.
     */
    load(newLocale?: Locale | null): Promise<boolean>;

    /**
     * Translates message with optional formatting options. See {@link MsgLocalization} for details regarding message assets.
     * 
     * When a string option is passed, it is converted to the `Xxx` form and the method appends it to the identifier.
     * Multiple string options may be passed, where the method appends in sequence order.
     *
     * When an object or `Map` is specified, it assigns variables to the message.
    */
    t(id: string, ...options: (string | Object)[]): string;

    reflectOptions(): LocalizationOptions;
    clone(): MsgLocalization;
}

export type TFunction = (id: string, ...options: (string | Object)[]) => string;

export declare class LocaleEvent {
    constructor(type: string);

    readonly type: string;
}

export type LocalizationOptions = {
    supportsLocales: (string | Locale)[],
    defaultLocale: string | Locale,
    fallbacks?: any,
    assets: LocalizationAssetOptions,
};

export type LocalizationAssetOptions = {
    src: string,
    files: string[],
    cleanUnusedAssets?: boolean,
    loadAssetsVia?: 'http' | 'fileSystem';
};

export class Locale {
    readonly standardTag: LanguageTags.Tag;
    readonly direction: Direction;
    readonly internationalName: string;
    readonly nativeName: string;
    readonly country: Country | null;

    toString(): string;
}

export class Country {
    readonly internationalName: string;

    getName(forLocale: Locale): string;
    toString(): string;
}

export type Direction = 'leftToRight' | 'rightToLeft';

/**
 * Parses locale identifier. This method returns the same object reference
 * for different calls using the same argument.
 */
export declare function parseLocale(id: string): Locale | null;

/**
 * Parses country identifier. This method returns the same object reference
 * for different calls using the same argument.
 */
export declare function parseCountry(id: string): Country | null;
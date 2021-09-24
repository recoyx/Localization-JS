import { MsgLocalization, parseLocale } from '../src/MsgLocalization.js';

const localization = new MsgLocalization({
    supportsLocales: ['en-US'],
    defaultLocale: 'en-US',
    assets: {
        src: 'test/res/lang',
        files: ['common'],
        cleanUnusedAssets: true,
        loadAssetsVia: 'fileSystem',
    },
});

(async () => {
    // Promise<boolean>
    await localization.load();

    const t = localization.t.bind(localization);
    console.log(t('common.messageId'));
    console.log(t('common.parameterized', { x: 'foo' }));
    console.log(t('common.contextual', 'female', 'other'));
    console.log(t('common.qty', { number: 10 }, new Intl.PluralRules(localization.currentLocaleSeqStr).select(10)));
})();
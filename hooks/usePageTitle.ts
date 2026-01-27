import { useContext, useEffect } from 'react';
import { PageTitleContext } from '../contexts/PageTitleContext';

/**
 * A hook to set the document and header title for a page.
 * @param title The title to set for the page.
 */
export const usePageTitle = (title: string) => {
    const { setTitle } = useContext(PageTitleContext);

    useEffect(() => {
        if (title) {
            setTitle(title);
            document.title = `Budgeting System - ${title}`;
        }
    }, [title, setTitle]);
};

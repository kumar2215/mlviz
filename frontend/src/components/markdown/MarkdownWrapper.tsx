import Markdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeMathjax from "rehype-mathjax";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

interface MarkdownWrapperProps {
    children: string;
    variant?: "default" | "small";
}

type ParagraphProps = React.ComponentProps<"p"> & ExtraProps;

const Paragraph: React.FC<ParagraphProps> = ({ children, node, ...props }) => {
    return (
        <p
            className="text-gray-800 mb-2"
            {...props}
        >
            {children}
        </p>
    );
};

type Heading1Props = React.ComponentProps<"h1"> & ExtraProps;

const Heading1: React.FC<Heading1Props> = ({ children, node, ...props }) => {
    return (
        <h1
            className="my-4 bg-gradient-to-br from-blue-600 to-purple-700 bg-clip-text text-transparent font-width-expanded"
            {...props}
        >
            {children}
        </h1>
    );
};

type Heading2Props = React.ComponentProps<"h2"> & ExtraProps;

const Heading2: React.FC<Heading2Props> = ({ children, node, ...props }) => {
    return (
        <h2
            className="bg-gradient-to-br from-purple-600 to-indigo-500 bg-clip-text text-transparent font-width-expanded my-4"
            {...props}
        >
            {children}
        </h2>
    );
};

type Heading3Props = React.ComponentProps<"h3"> & ExtraProps;

const Heading3: React.FC<Heading3Props> = ({ children, node, ...props }) => {
    return (
        <h3
            className="font-bold text-xl my-4 tracking-tight bg-gradient-to-br from-gray-500 to-slate-400 bg-clip-text text-transparent font-width-expanded"
            {...props}
        >
            {children}
        </h3>
    );
};

type Heading4Props = React.ComponentProps<"h4"> & ExtraProps;

const Heading4: React.FC<Heading4Props> = ({ children, node, ...props }) => {
    return (
        <h4
            className="font-bold text-2xl my-4 tracking-tight bg-gradient-to-br from-gray-400 to-slate-300 bg-clip-text text-transparent font-width-expanded"
            {...props}
        >
            {children}
        </h4>
    );
};

type UnorderedListProps = React.ComponentProps<"ul"> & ExtraProps;

const UnorderedList: React.FC<UnorderedListProps> = ({
    children,
    node,
    ...props
}) => {
    return (
        <ul
            className="list-disc ml-6 space-y-2 my-4"
            {...props}
        >
            {children}
        </ul>
    );
};

type OrderedListProps = React.ComponentProps<"ol"> & ExtraProps;

const OrderedList: React.FC<OrderedListProps> = ({
    children,
    node,
    ...props
}) => {
    return (
        <ol
            className="list-decimal ml-6 space-y-2 my-4"
            {...props}
        >
            {children}
        </ol>
    );
};

type ListItemProps = React.ComponentProps<"li"> & ExtraProps;

const ListItem: React.FC<ListItemProps> = ({ children, node, ...props }) => {
    return (
        <li
            className="text-base tracking-tight font-light mx-1"
            {...props}
        >
            {children}
        </li>
    );
};

type ImageProps = React.ComponentProps<"img"> & ExtraProps;

const Image: React.FC<ImageProps> = ({ src, alt, node, ...props }) => {
    return (
        <img
            className="max-w-full max-h-[40vh] xl:max-h-[50vh] 2xl:max-h-[60vh] w-auto h-auto object-contain my-4 rounded-lg shadow-lg block"
            src={src}
            alt={alt}
            {...props}
        />
    );
};

type TableProps = React.ComponentProps<"table"> & ExtraProps;

const Table: React.FC<TableProps> = ({ children, node, ...props }) => {
    return (
        <div className="overflow-x-auto my-6">
            <table
                className="min-w-full border-collapse border border-gray-300 shadow-md rounded-lg"
                {...props}
            >
                {children}
            </table>
        </div>
    );
};

type TableHeadProps = React.ComponentProps<"thead"> & ExtraProps;

const TableHead: React.FC<TableHeadProps> = ({ children, node, ...props }) => {
    return (
        <thead
            className="bg-gradient-to-br from-blue-600 to-purple-700 bg-clip-text text-transparent !text-2xl font-width-expanded"
            {...props}
        >
            {children}
        </thead>
    );
};

type TableBodyProps = React.ComponentProps<"tbody"> & ExtraProps;

const TableBody: React.FC<TableBodyProps> = ({ children, node, ...props }) => {
    return (
        <tbody
            className="bg-white"
            {...props}
        >
            {children}
        </tbody>
    );
};

type TableRowProps = React.ComponentProps<"tr"> & ExtraProps;

const TableRow: React.FC<TableRowProps> = ({ children, node, ...props }) => {
    return (
        <tr
            className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
            {...props}
        >
            {children}
        </tr>
    );
};

type TableHeaderCellProps = React.ComponentProps<"th"> & ExtraProps;

const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
    children,
    node,
    ...props
}) => {
    return (
        <th
            className="px-6 py-3 text-left text-sm font-semibold tracking-tight bg-gradient-to-br from-blue-600 to-purple-700 bg-clip-text text-transparent hover:from-blue-600 hover:to-purple-700"
            {...props}
        >
            {children}
        </th>
    );
};

type TableDataCellProps = React.ComponentProps<"td"> & ExtraProps;

const TableDataCell: React.FC<TableDataCellProps> = ({
    children,
    node,
    ...props
}) => {
    return (
        <td
            className="px-6 py-4 text-sm text-gray-700 tracking-tight"
            {...props}
        >
            {children}
        </td>
    );
};

const DefaultComponentMap: Components = {
    p: Paragraph,
    h1: Heading1,
    h2: Heading2,
    h3: Heading3,
    h4: Heading4,
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,
    img: Image,
    table: Table,
    thead: TableHead,
    tbody: TableBody,
    tr: TableRow,
    th: TableHeaderCell,
    td: TableDataCell,
};

const MarkdownWrapper: React.FC<MarkdownWrapperProps> = ({
    children,
    variant = "default",
}) => {
    const content = (
        <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeMathjax]}
            components={DefaultComponentMap}
        >
            {children}
        </Markdown>
    );

    if (variant === "small") {
        return (
            <div className="text-xs leading-tight [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_h4]:text-xs [&_p]:mb-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_li]:mx-0 [&_h1]:my-1 [&_h2]:my-1 [&_h3]:my-1 [&_h4]:my-1 [&_img]:my-2">
                {content}
            </div>
        );
    }

    return content;
};

export default MarkdownWrapper;

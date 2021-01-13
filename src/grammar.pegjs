// ---------- common functions ----------
{
    function concatList(head, tail, skip) {
        var t;

        t = tail.reduce(function(acc, val) {
            return acc.concat(val[skip]);
        }, []);

        return [head].concat(t);
    }

    function reduceModifiersArray(mods, defaults = {}) {
        return (mods || []).reduce((map, val) => ({...map, ...val}), defaults);
    }
}
// ---------- common functions ----------

start = head:statement tail:(whitespace* statement)* __ { return concatList(head, tail, 1); }

// ---------- top level definitions ----------

statement = 
    use_database
    / drop_statement
    / create_statement
    / alter_statement
    / delimiter_statement { return { type: 'delimiter' }; }
    / whitespace* '--' '-'* [^\r\n]* { return {type: 'comment'}; }       // comment line
    / whitespace* block_comment { return {type: 'comment'}; }            // block comment at statements level

use_database = 
    whitespace* KW_USE __ name:ident_name __ EOS { return { type: 'use_database', name }; }

drop_statement =
    whitespace* KW_DROP __ target:drop_target (__ drop_condition)? __ schema_name? name:ident_name __ EOS { return { type: 'drop_schema_item', target, name};}

create_statement = 
    whitespace* KW_CREATE __ sw:create_kinds { return { type: 'create_schema_item', ...sw}; }

alter_statement = 
    whitespace* KW_ALTER __ KW_TABLE __ name:ident_name __ changes:alter_spec_list __ EOS { return { type: 'alter_table', name, changes }; }

delimiter_statement =
    KW_DELIMITER __ (KW_SEMICOLON / KW_ALT_DELIMITER) EOL

// ---------- top level definitions ----------

alter_spec_list = head:alter_spec tail:(__ KW_COMMA __ alter_spec)* { return concatList(head, tail, 3); }

alter_spec = 
    operation_type:KW_ADD __ add_spec:alter_add_spec { return { operation_type, ...add_spec }; }
    / operation_type:KW_ALTER __ (KW_COLUMN __)? name:ident_name __ spec:alter_column_spec { return { operation_type, name, ...spec }; }
    / operation_type:KW_DROP __ spec:alter_drop_spec { return { operation_type, ...spec }; }
    / KW_CHANGE (__ KW_COLUMN)? __ old_name:ident_name __ new_name:ident_name __ column_definition (__ KW_FIRST / (KW_AFTER after:index_name))?
    / KW_FORCE { return { alt_type: 'force_rebuild' }; }
    / KW_RENAME __ (__ (KW_TO / KW_AS))? new_table_name:ident_name { return { alt_type: 'rename_table', new_table_name }; }

alter_add_spec = 
    (KW_COLUMN __)? col_name:ident_name __ definition:column_definition (__ KW_FIRST / (KW_AFTER after:ident_name))? { return { alt_type: 'add_column', definition }; }
    / (KW_COLUMN __)? __ KW_LBRACKET __ definitions:column_definitions __ KW_RBRACKET { return { alt_type: 'add_column', definitions }; }
    / index_or_key name:(__ ident_name)? index_type:index_type? __ KW_LBRACKET __ key_parts:key_part_list __ KW_RBRACKET
    / constraint_name? KW_FOREIGN_KEY name:(__ ident_name)? __ KW_LBRACKET __ ref_columns:ident_list __ KW_RBRACKET __ KW_REFERENCES __ ref_table_name:ident_name __ 
        KW_LBRACKET __ ref_keys:ident_list __ KW_RBRACKET ref_actions:reference_action* __ {
            return {
                alt_type: 'add_foreign_key',
                name: name? name[1] : null,
                ref_columns,
                ref_table_name,
                ref_keys,
                ref_actions
            };
        }

alter_column_spec = 
    KW_SET __ KW_DEFAULT (number / string)
    / KW_DROP __ KW_DEFAULT

alter_drop_spec =
    (KW_COLUMN __)? name:ident_name { return { target: 'column', name }; }
    / index_or_key name:ident_name { return { target: 'index', name }; }
    / KW_PRIMARY_KEY { return { target: 'primary_key' }; }
    / KW_FOREIGN_KEY name:ident_name { return { target: 'foreign_key', name }; }

index_type =
    KW_USING __ (KW_BTREE / KW_HASH)

column_definitions = head:column_definition tail:(__ KW_COMMA __ column_definition)* { return concatList(head, tail, 3); }

create_kinds = 
    obj:create_database_table_view __ EOS { return obj; }
    / obj:create_routine __ program_end_mark { return obj; }
    / obj:create_view __ view_end_mark { return obj; }

create_database_table_view = 
    KW_DATABASE if_not_exists? __ name:ident_name __ KW_CHARACTER_SET __ KW_EQ_OPERATOR __ charset:ident_name __ 
        KW_COLLATE __ KW_EQ_OPERATOR __ collate:ident_name {
        return { 'schema_item': 'database', name, charset, collate };
    }
    / KW_TABLE if_not_exists? __ name:ident_name __ KW_LBRACKET __ definitions:create_definitions_list __ KW_RBRACKET options:create_table_options*  {
        return { 'schema_item': 'table', name, definitions, options: reduceModifiersArray(options) };
    }

create_routine = 
    KW_TRIGGER __ name:ident_name __ time:trigger_time event:trigger_event __ KW_ON __ table_name:ident_name __ KW_FOR __ KW_EACH __ KW_ROW __
        body:program_text_before_end __  {
        return { schema_item: 'trigger', name, table_name, time: time[1].toUpperCase(), event: event[1].toUpperCase(), body: body.join('') };
    }
    / KW_PROCEDURE __ name:ident_name __ KW_LBRACKET __ params:procedure_parameters __ KW_RBRACKET __ body:program_text_before_end __ {
        return { schema_item: 'procedure', name, body: body.join(''), params };
    }
    / KW_FUNCTION __ name:ident_name __ KW_LBRACKET __ params:procedure_parameters __ KW_RBRACKET __ KW_RETURNS __ type:data_types __ body:program_text_before_end __ {
        return { schema_item: 'function', name, body: body.join(''), params, returns: type };
    }

create_view = (KW_OR __ KW_REPLACE __)? (KW_ALGORITHM __ KW_EQ_OPERATOR __ view_algo __)? (KW_DEFINER __ KW_EQ_OPERATOR __ ident_name '@' (ident_name / '`%`') __)? 
        (KW_SQL __ KW_SECURITY __ (KW_DEFINER / KW_INVOKER) __)? KW_VIEW __ name:ident_name __ KW_AS __ body:view_query_before_end __ {
            return { 'schema_item': 'view', name, body };
        }

view_algo =
    KW_UNDEFINED
    / KW_MERGE
    / KW_TEMPTABLE

procedure_parameters = head:procedure_parameter tail:(__ KW_COMMA __ procedure_parameter)* { return concatList(head, tail, 3); }

procedure_parameter = 
    proc_parameter_direction? __ name:ident_name __ type:data_types { return { name, type }; }

proc_parameter_direction = 
    KW_IN
    / KW_OUT
    / KW_INOUT

trigger_time = 
    __ KW_BEFORE
    / __ KW_AFTER

trigger_event = 
    __ KW_INSERT
    / __ KW_UPDATE
    / __ KW_DELETE

program_text_before_end = 
    chr:(!program_end_mark .)* { return chr.map(i => i[1]); }

program_end_mark =
    KW_ALT_DELIMITER EOL

view_query_before_end = 
    chr:(!view_end_mark .)* { return chr.map(i => i[1]); }

view_end_mark = KW_SEMICOLON EOL

if_not_exists = __ KW_IF __ KW_NOT __ KW_EXISTS

create_definitions_list = head:create_definition tail:(__ KW_COMMA __ create_definition)* { return concatList(head, tail, 3); }

create_definition = 
    index_definition
    / column_definition

create_table_options = 
    __ KW_ENGINE (__ KW_EQ_OPERATOR)? __ name:ident_name { return { engine: name }; }
    / __ KW_AUTO_INCREMENT (__ KW_EQ_OPERATOR) __ num:number { return { auto_increment: num }; }
    / __ (KW_DEFAULT __ )? KW_CHARSET (__ KW_EQ_OPERATOR) __ charset:ident_name { return { charset }; }
    / __ (KW_DEFAULT __ )? KW_COLLATE (__ KW_EQ_OPERATOR) __ collate:ident_name { return { collate }; }

column_definition =
    name:ident_name __ datatype:data_types mods:column_additional_modifiers* {
        return { 
            'def_type': 'column',
            name, 
            datatype, 
            ...reduceModifiersArray(mods, { auto_incr: false, is_pk: false, nullable: true, def_val: null })
        };
    }

column_additional_modifiers =
    __ auto_incr:KW_AUTO_INCREMENT { return { auto_incr: Boolean(auto_incr)};}
    / __ pk:KW_PRIMARY_KEY { return { is_pk: Boolean(pk)};}
    / __ nullable:column_nullability_spec { return { nullable: (nullable !== undefined && nullable !== null) ? nullable : true }; }
    / __ def_val:default_value_spec { return { def_val };}
    / __ KW_COMMENT __ '\'' text:[^']* '\'' { return { comment: text.join('') }; }

index_definition = 
    index_or_key __ name:ident_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ { 
        return { 
            'def_type': 'index', 
            name,
            columns
            };
        }
    / constraint_name? KW_FOREIGN_KEY __ KW_LBRACKET __ ref_columns:ident_list __ KW_RBRACKET __ KW_REFERENCES __ ref_table_name:ident_name __ KW_LBRACKET __ 
        ref_keys:ident_list __ KW_RBRACKET ref_actions:reference_action* __ {
            return {
                'def_type': 'foreign_key',
                ref_columns,
                ref_table_name,
                ref_keys,
                ref_actions: ref_actions
            };
        }
    / constraint_name? KW_PRIMARY_KEY __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type': 'primary_key',
                columns
            };
        }
    / constraint_name? KW_UNIQUE (__ index_or_key)? name:index_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type': 'unique_index',
                name,
                columns
            };
        }
    / type:spatial_or_fulltext (__ index_or_key)? name:index_name? __ KW_LBRACKET __ columns:key_part_list __ KW_RBRACKET __ {
        return {
                'def_type':  type.toLowerCase() + '_index',
                name,
                columns
            };
        }

constraint_name = KW_CONSTRAINT __ name:ident_name __ { return {name} }

index_or_key =
    KW_INDEX
    / KW_KEY

key_part_list = head:key_part tail:(__ KW_COMMA __ key_part)* { return concatList(head, tail, 3); }
key_part = name:ident_name length:bracketed_length? order:(__ order)? { return { name, length, order: order ? order[1] : null }; }
bracketed_length = __ KW_LBRACKET __ length:number __ KW_RBRACKET { return length; }

order =
    KW_ASC
    / KW_DESC

spatial_or_fulltext =
    KW_SPATIAL
    / KW_FULLTEXT

index_name = __ name:ident_name { return name; }

reference_action = 
    on_delete_reference_action
    / on_update_reference_action

on_delete_reference_action =
    __ KW_ON __ KW_DELETE __ on_delete_ref:reference_option { return { event: 'on_delete', action: on_delete_ref.toUpperCase() }; }

on_update_reference_action =
    __ KW_ON __ KW_UPDATE __ on_update_ref:reference_option { return { event: 'on_delete', action: on_update_ref.toUpperCase() }; }

data_types = 
    type:KW_INTEGER width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: 'int', is_unsigned: Boolean(unsigned), width } }
    / type:KW_INT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_TINYINT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_VARCHAR width:data_type_width? mods:text_column_modifiers* { 
        return { 
            'type': type.toLowerCase(), 
            width, 
            ...reduceModifiersArray(mods, { char_set: null, collation: null })
        }
    }
    / type:KW_TEXT width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }
    / type:KW_CHAR width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }
    / type:KW_DECIMAL width:decimal_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), ...width } }
    / type:KW_DEC width:decimal_width? unsigned:(__ KW_UNSIGNED)? { return { type: 'decimal', is_unsigned: Boolean(unsigned), ...width } }
    / type:KW_FIXED width: decimal_width? { return { type: 'decimal', ...width } }
    / type:KW_BOOLEAN { return { type: type.toLowerCase() } }
    / type:KW_BOOL { return { type: type.toLowerCase() } }
    / type:KW_TIMESTAMP { return { type: type.toLowerCase() } }
    / type:KW_DATETIME { return { type: type.toLowerCase() } }
    / type:KW_FLOAT width: decimal_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), ...width } }
    / type:KW_BLOB width:data_type_width? { return { type: type.toLowerCase(), width } }
    / type:KW_ENUM __ KW_LBRACKET __ enum_list __ KW_RBRACKET mods:text_column_modifiers? { return { type: type.toLowerCase() } }
    / type:KW_BIGINT width: data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_POINT { return { type: type.toLowerCase() } }
    / type:KW_SMALLINT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_MEDIUMTEXT width:data_type_width? mods:text_column_modifiers? { return { type: type.toLowerCase(), width } }
    / type:KW_BIT width:data_type_width? { return { type: type.toLowerCase(), width } }
    / type:KW_MEDIUMINT width:data_type_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), width } }
    / type:KW_DOUBLE width: decimal_width? unsigned:(__ KW_UNSIGNED)? { return { type: type.toLowerCase(), is_unsigned: Boolean(unsigned), ...width } }

data_type_width =
    __ KW_LBRACKET __ width:number __ KW_RBRACKET { return width; }

text_column_modifiers =
    __ KW_CHARACTER_SET __ name:ident_name { return {char_set: name}; }
    / __ KW_COLLATE __ name:ident_name { return { collation: name}; }

decimal_width =
    __ KW_LBRACKET __ total_width:number __ KW_COMMA __ fraction_width:number KW_RBRACKET { return {width: total_width, fraction_width}; }

default_value_spec = 
    KW_DEFAULT __ value:default_value { return value; }

default_value = 
    KW_NULL { return { is_null: true, value: null }; }
    / value:([0-9]+) { return { is_null: false, value: value.join() }; }
    / KW_QUOTE_CHAR chars:[^\']* KW_QUOTE_CHAR { return {is_null: false, value: chars.join('') }; }
    / KW_CURRENT_TIMESTAMP { return { is_null: false, value:'CURRENT TIMESTAMP', is_current_timestamp: true }; }

reference_option =
    $KW_RESTRICT
    / $KW_CASCADE
    / $KW_SET_NULL
    / $KW_NO_ACTION 
    / $KW_SET_DEFAULT

column_nullability_spec = 
    KW_NOT_NULL { return false; }
    / KW_NULL { return true; }

drop_target = 
    KW_DATABASE
    / KW_TABLE
    / KW_TRIGGER
    / KW_PROCEDURE
    / KW_FUNCTION

drop_condition = 
    KW_IF __ KW_EXISTS

schema_name = 
    name: ident_name '.' { return name; }

ident_list = head:ident_name tail:(__ KW_COMMA __ ident_name)* { return concatList(head, tail, 1); }

ident_name = 
    head:[A-Za-z0-9_%~] tail:[A-Za-z0-9$_\-\%~]* { return head + tail.join(''); }
    / '`' head:[A-Za-z0-9_%~] tail:[A-Za-z0-9$_\-\%~]* '`' { return head + tail.join(''); }

enum_list = 
    head:enum_entry tail:(__ KW_COMMA __ enum_entry)* { 
        return concatList(head, tail, 3);
    }

enum_entry = 
    KW_NULL
    / '\'\''
    / KW_QUOTE_CHAR [A-Za-z]+ KW_QUOTE_CHAR

// ident_start = [A-Za-z0-9_]
// ident_part  = [A-Za-z0-9$_-]

EOS = 
    KW_SEMICOLON EOL

newline = 
    '\n' 
    / '\r' '\n'?
EOL = newline / !.

whitespace = [\t\n\r ]
__ = (whitespace / comment)*

comment = 
    block_comment
  / line_comment

block_comment = "/*" (!"*/" .)* "*/"
line_comment = "--" (!EOL .)*
char = .
// empty_line = EOL

string = KW_QUOTE_CHAR [A-Za-z]+ KW_QUOTE_CHAR
number = digits:([0-9]+) { return parseInt(digits.join('')); }

// ---------- keywords and markup units ----------

KW_SEMICOLON = ";"
KW_ALT_DELIMITER = "$$";
KW_EQ_OPERATOR = '=';
KW_LBRACKET = '(';
KW_RBRACKET = ')';
KW_COMMA = ',';

KW_USE = 'USE'i;
KW_DROP = 'DROP'i;
KW_CREATE = 'CREATE'i;
KW_DATABASE = 'DATABASE'i;
KW_NOT = 'NOT'i;
KW_CHARACTER = 'CHARACTER'i;
KW_SET = 'SET'i;
KW_CHARACTER_SET = KW_CHARACTER __ KW_SET;
KW_COLLATE = 'COLLATE'i;
KW_UNSIGNED = 'UNSIGNED'i;
KW_INT = 'INT'i;
KW_NULL = 'NULL'i;
KW_NOT_NULL = KW_NOT __ KW_NULL;
KW_VARCHAR = 'VARCHAR'i;
KW_TINYINT = 'TINYINT'i;
KW_KEY = 'KEY'i;
KW_FOREIGN = 'FOREIGN'i;
KW_FOREIGN_KEY = KW_FOREIGN __ KW_KEY;
KW_PRIMARY = 'PRIMARY'i;
KW_PRIMARY_KEY = KW_PRIMARY __ KW_KEY;
KW_REFERENCES = 'REFERENCES'i;
KW_ON = 'ON'i;
KW_DELETE = 'DELETE'i;
KW_CASCADE = 'CASCADE'i;
KW_TABLE = 'TABLE'i;
KW_AUTO_INCREMENT = 'AUTO_INCREMENT'i;
KW_CONSTRAINT = 'CONSTRAINT'i;
KW_CHARSET = 'CHARSET'i;
KW_TEXT = 'TEXT'i;
KW_UPDATE = 'UPDATE'i;
KW_RESTRICT = 'RESTRICT'i;
KW_SET_NULL = KW_SET __ KW_NULL;
KW_NO = 'NO'i;
KW_ACTION = 'ACTION'i;
KW_NO_ACTION = KW_NO __ KW_ACTION;
KW_DEFAULT = 'DEFAULT'i;
KW_SET_DEFAULT = KW_SET __ KW_DEFAULT;
KW_IF = 'IF'i;
KW_CHAR = 'CHAR'i;
KW_DECIMAL = 'DECIMAL'i;
KW_BOOLEAN = 'BOOLEAN'i;
KW_BOOL = 'BOOL'i;
KW_TIMESTAMP = 'TIMESTAMP'i;
KW_DATETIME = 'DATETIME'i;
KW_FLOAT = 'FLOAT'i;
KW_BLOB = 'BLOB'i;
KW_ENUM = 'ENUM'i;
KW_ALTER = 'ALTER'i;
KW_ADD = 'ADD'i;
KW_EXISTS = 'EXISTS'i;
KW_ENGINE = 'ENGINE'i;
KW_COMMENT = 'COMMENT'i;
KW_UNIQUE = 'UNIQUE'i;
KW_INDEX = 'INDEX'i;
KW_ASC = 'ASC'i;
KW_DESC = 'DESC'i;
KW_SPATIAL = 'SPATIAL'i;
KW_FULLTEXT = 'FULLTEXT'i;
KW_BIGINT = 'BIGINT'i;
KW_POINT = 'POINT'i;
KW_SMALLINT = 'SMALLINT'i;
KW_MEDIUMTEXT = 'MEDIUMTEXT'i;
KW_CURRENT_TIMESTAMP = 'CURRENT_TIMESTAMP'i;
KW_QUOTE_CHAR = '\'';
KW_TRIGGER = 'TRIGGER'i;
KW_PROCEDURE = 'PROCEDURE'i;
KW_DELIMITER = 'DELIMITER'i;
KW_BEFORE = 'BEFORE'i;
KW_AFTER = 'AFTER'i;
KW_INSERT = 'INSERT'i;
KW_FOR = 'FOR'i;
KW_EACH = 'EACH'i;
KW_ROW = 'ROW'i;
KW_BEGIN = 'BEGIN'i;
KW_END = 'END';
KW_IN = 'IN'i;
KW_OUT = 'OUT'i;
KW_INOUT = 'INOUT'i;
KW_INTEGER = 'INTEGER'i;
KW_ZEROFILL = 'ZEROFILL'i;
KW_BIT = 'BIT'i;
KW_MEDIUMINT = 'MEDIUMINT'i;
KW_DEC = 'DEC'i;
KW_FIXED = 'FIXED'i;
KW_DOUBLE = 'DOUBLE'i;
KW_CHANGE = 'CHANGE'i;
KW_COLUMN = 'COLUMN'i;
KW_FIRST = 'FIRST'i;
KW_FORCE = 'FORCE'i;
KW_RENAME = 'RENAME'i;
KW_TO = 'TO'i;
KW_AS = 'AS'i;
KW_USING = 'USING'i;
KW_BTREE = 'BTREE'i;
KW_HASH = 'HASH'i;
KW_FUNCTION = 'FUNCTION'i;
KW_AGGREGATE = 'AGGREGATE'i;
KW_RETURNS = 'RETURNS'i;
KW_VIEW = 'VIEW'i;
KW_ALGORITHM = 'ALGORITHM'i;
KW_UNDEFINED = 'UNDEFINED'i;
KW_DEFINER = 'DEFINER'i;
KW_OR = 'OR'i;
KW_REPLACE = 'REPLACE'i;
KW_MERGE = 'MERGE'i;
KW_TEMPTABLE = 'TEMPTABLE'i;
KW_SQL  = 'SQL'i;
KW_SECURITY = 'SECURITY'i;
KW_INVOKER = 'INVOKER'i;

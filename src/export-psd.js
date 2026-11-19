var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/trees.js"(exports, module) {
    "use strict";
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = (
      /* extra bits for each length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
    );
    var extra_dbits = (
      /* extra bits for each distance code */
      new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
    );
    var extra_blbits = (
      /* extra bits for each bit length code */
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
    );
    var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    var d_code = (dist) => {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    };
    var put_short = (s, w) => {
      s.pending_buf[s.pending++] = w & 255;
      s.pending_buf[s.pending++] = w >>> 8 & 255;
    };
    var send_bits = (s, value, length) => {
      if (s.bi_valid > Buf_size - length) {
        s.bi_buf |= value << s.bi_valid & 65535;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> Buf_size - s.bi_valid;
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= value << s.bi_valid & 65535;
        s.bi_valid += length;
      }
    };
    var send_code = (s, c, tree) => {
      send_bits(
        s,
        tree[c * 2],
        tree[c * 2 + 1]
        /*.Len*/
      );
    };
    var bi_reverse = (code, len) => {
      let res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    };
    var bi_flush = (s) => {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 255;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    };
    var gen_bitlen = (s, desc) => {
      const tree = desc.dyn_tree;
      const max_code = desc.max_code;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const extra = desc.stat_desc.extra_bits;
      const base = desc.stat_desc.extra_base;
      const max_length = desc.stat_desc.max_length;
      let h;
      let n, m;
      let bits;
      let xbits;
      let f;
      let overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }
      tree[s.heap[s.heap_max] * 2 + 1] = 0;
      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
          continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
          bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] !== bits) {
            s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
            tree[m * 2 + 1] = bits;
          }
          n--;
        }
      }
    };
    var gen_codes = (tree, max_code, bl_count) => {
      const next_code = new Array(MAX_BITS + 1);
      let code = 0;
      let bits;
      let n;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        code = code + bl_count[bits - 1] << 1;
        next_code[bits] = code;
      }
      for (n = 0; n <= max_code; n++) {
        let len = tree[n * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
      }
    };
    var tr_static_init = () => {
      let n;
      let bits;
      let length;
      let code;
      let dist;
      const bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    };
    var init_block = (s) => {
      let n;
      for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
      }
      s.dyn_ltree[END_BLOCK * 2] = 1;
      s.opt_len = s.static_len = 0;
      s.sym_next = s.matches = 0;
    };
    var bi_windup = (s) => {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    };
    var smaller = (tree, n, m, depth) => {
      const _n2 = n * 2;
      const _m2 = m * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
    };
    var pqdownheap = (s, tree, k) => {
      const v = s.heap[k];
      let j = k << 1;
      while (j <= s.heap_len) {
        if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
      }
      s.heap[k] = v;
    };
    var compress_block = (s, ltree, dtree) => {
      let dist;
      let lc;
      let sx = 0;
      let code;
      let extra;
      if (s.sym_next !== 0) {
        do {
          dist = s.pending_buf[s.sym_buf + sx++] & 255;
          dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
          lc = s.pending_buf[s.sym_buf + sx++];
          if (dist === 0) {
            send_code(s, lc, ltree);
          } else {
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (sx < s.sym_next);
      }
      send_code(s, END_BLOCK, ltree);
    };
    var build_tree = (s, desc) => {
      const tree = desc.dyn_tree;
      const stree = desc.stat_desc.static_tree;
      const has_stree = desc.stat_desc.has_stree;
      const elems = desc.stat_desc.elems;
      let n, m;
      let max_code = -1;
      let node;
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else {
          tree[n * 2 + 1] = 0;
        }
      }
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree) {
          s.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n = s.heap_len >> 1; n >= 1; n--) {
        pqdownheap(s, tree, n);
      }
      node = elems;
      do {
        n = s.heap[
          1
          /*SMALLEST*/
        ];
        s.heap[
          1
          /*SMALLEST*/
        ] = s.heap[s.heap_len--];
        pqdownheap(
          s,
          tree,
          1
          /*SMALLEST*/
        );
        m = s.heap[
          1
          /*SMALLEST*/
        ];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[
          1
          /*SMALLEST*/
        ] = node++;
        pqdownheap(
          s,
          tree,
          1
          /*SMALLEST*/
        );
      } while (s.heap_len >= 2);
      s.heap[--s.heap_max] = s.heap[
        1
        /*SMALLEST*/
      ];
      gen_bitlen(s, desc);
      gen_codes(tree, max_code, s.bl_count);
    };
    var scan_tree = (s, tree, max_code) => {
      let n;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2]++;
          }
          s.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var send_tree = (s, tree, max_code) => {
      let n;
      let prevlen = -1;
      let curlen;
      let nextlen = tree[0 * 2 + 1];
      let count = 0;
      let max_count = 7;
      let min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);
        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);
        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    };
    var build_bl_tree = (s) => {
      let max_blindex;
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
      build_tree(s, s.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    };
    var send_all_trees = (s, lcodes, dcodes, blcodes) => {
      let rank;
      send_bits(s, lcodes - 257, 5);
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s, s.dyn_ltree, lcodes - 1);
      send_tree(s, s.dyn_dtree, dcodes - 1);
    };
    var detect_data_type = (s) => {
      let block_mask = 4093624447;
      let n;
      for (n = 0; n <= 31; n++, block_mask >>>= 1) {
        if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    };
    var static_init_done = false;
    var _tr_init = (s) => {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
      s.bi_buf = 0;
      s.bi_valid = 0;
      init_block(s);
    };
    var _tr_stored_block = (s, buf, stored_len, last) => {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      bi_windup(s);
      put_short(s, stored_len);
      put_short(s, ~stored_len);
      if (stored_len) {
        s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
      }
      s.pending += stored_len;
    };
    var _tr_align = (s) => {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    };
    var _tr_flush_block = (s, buf, stored_len, last) => {
      let opt_lenb, static_lenb;
      let max_blindex = 0;
      if (s.level > 0) {
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = s.opt_len + 3 + 7 >>> 3;
        static_lenb = s.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s, buf, stored_len, last);
      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      init_block(s);
      if (last) {
        bi_windup(s);
      }
    };
    var _tr_tally = (s, dist, lc) => {
      s.pending_buf[s.sym_buf + s.sym_next++] = dist;
      s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
      s.pending_buf[s.sym_buf + s.sym_next++] = lc;
      if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
      } else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
      }
      return s.sym_next === s.sym_end;
    };
    module.exports._tr_init = _tr_init;
    module.exports._tr_stored_block = _tr_stored_block;
    module.exports._tr_flush_block = _tr_flush_block;
    module.exports._tr_tally = _tr_tally;
    module.exports._tr_align = _tr_align;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/adler32.js"(exports, module) {
    "use strict";
    var adler32 = (adler, buf, len, pos) => {
      let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
      while (len !== 0) {
        n = len > 2e3 ? 2e3 : len;
        len -= n;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    };
    module.exports = adler32;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/crc32.js
var require_crc32 = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/crc32.js"(exports, module) {
    "use strict";
    var makeTable = () => {
      let c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    };
    var crcTable = new Uint32Array(makeTable());
    var crc32 = (crc, buf, len, pos) => {
      const t = crcTable;
      const end = pos + len;
      crc ^= -1;
      for (let i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    };
    module.exports = crc32;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/messages.js"(exports, module) {
    "use strict";
    module.exports = {
      2: "need dictionary",
      /* Z_NEED_DICT       2  */
      1: "stream end",
      /* Z_STREAM_END      1  */
      0: "",
      /* Z_OK              0  */
      "-1": "file error",
      /* Z_ERRNO         (-1) */
      "-2": "stream error",
      /* Z_STREAM_ERROR  (-2) */
      "-3": "data error",
      /* Z_DATA_ERROR    (-3) */
      "-4": "insufficient memory",
      /* Z_MEM_ERROR     (-4) */
      "-5": "buffer error",
      /* Z_BUF_ERROR     (-5) */
      "-6": "incompatible version"
      /* Z_VERSION_ERROR (-6) */
    };
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/constants.js
var require_constants = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      /* Allowed flush values; see deflate() and inflate() below for details */
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_MEM_ERROR: -4,
      Z_BUF_ERROR: -5,
      //Z_VERSION_ERROR: -6,
      /* compression levels */
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY: 0,
      Z_TEXT: 1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN: 2,
      /* The deflate compression method */
      Z_DEFLATED: 8
      //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/deflate.js"(exports, module) {
    "use strict";
    var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var msg = require_messages();
    var {
      Z_NO_FLUSH,
      Z_PARTIAL_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_BLOCK,
      Z_OK,
      Z_STREAM_END,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_BUF_ERROR,
      Z_DEFAULT_COMPRESSION,
      Z_FILTERED,
      Z_HUFFMAN_ONLY,
      Z_RLE,
      Z_FIXED,
      Z_DEFAULT_STRATEGY,
      Z_UNKNOWN,
      Z_DEFLATED
    } = require_constants();
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var GZIP_STATE = 57;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    var err = (strm, errorCode) => {
      strm.msg = msg[errorCode];
      return errorCode;
    };
    var rank = (f) => {
      return f * 2 - (f > 4 ? 9 : 0);
    };
    var zero = (buf) => {
      let len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    };
    var slide_hash = (s) => {
      let n, m;
      let p;
      let wsize = s.w_size;
      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = m >= wsize ? m - wsize : 0;
      } while (--n);
      n = wsize;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = m >= wsize ? m - wsize : 0;
      } while (--n);
    };
    var HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
    var HASH = HASH_ZLIB;
    var flush_pending = (strm) => {
      const s = strm.state;
      let len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    };
    var flush_block_only = (s, last) => {
      _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    };
    var put_byte = (s, b) => {
      s.pending_buf[s.pending++] = b;
    };
    var putShortMSB = (s, b) => {
      s.pending_buf[s.pending++] = b >>> 8 & 255;
      s.pending_buf[s.pending++] = b & 255;
    };
    var read_buf = (strm, buf, start, size) => {
      let len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    };
    var longest_match = (s, cur_match) => {
      let chain_length = s.max_chain_length;
      let scan = s.strstart;
      let match;
      let len;
      let best_len = s.prev_length;
      let nice_match = s.nice_match;
      const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
      const _win = s.window;
      const wmask = s.w_mask;
      const prev = s.prev;
      const strend = s.strstart + MAX_MATCH;
      let scan_end1 = _win[scan + best_len - 1];
      let scan_end = _win[scan + best_len];
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    };
    var fill_window = (s) => {
      const _w_size = s.w_size;
      let n, more, str;
      do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          s.block_start -= _w_size;
          if (s.insert > s.strstart) {
            s.insert = s.strstart;
          }
          slide_hash(s);
          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];
          s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
          while (s.insert) {
            s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
    };
    var deflate_stored = (s, flush) => {
      let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
      let len, left, have, last = 0;
      let used = s.strm.avail_in;
      do {
        len = 65535;
        have = s.bi_valid + 42 >> 3;
        if (s.strm.avail_out < have) {
          break;
        }
        have = s.strm.avail_out - have;
        left = s.strstart - s.block_start;
        if (len > left + s.strm.avail_in) {
          len = left + s.strm.avail_in;
        }
        if (len > have) {
          len = have;
        }
        if (len < min_block && (len === 0 && flush !== Z_FINISH || flush === Z_NO_FLUSH || len !== left + s.strm.avail_in)) {
          break;
        }
        last = flush === Z_FINISH && len === left + s.strm.avail_in ? 1 : 0;
        _tr_stored_block(s, 0, 0, last);
        s.pending_buf[s.pending - 4] = len;
        s.pending_buf[s.pending - 3] = len >> 8;
        s.pending_buf[s.pending - 2] = ~len;
        s.pending_buf[s.pending - 1] = ~len >> 8;
        flush_pending(s.strm);
        if (left) {
          if (left > len) {
            left = len;
          }
          s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
          s.strm.next_out += left;
          s.strm.avail_out -= left;
          s.strm.total_out += left;
          s.block_start += left;
          len -= left;
        }
        if (len) {
          read_buf(s.strm, s.strm.output, s.strm.next_out, len);
          s.strm.next_out += len;
          s.strm.avail_out -= len;
          s.strm.total_out += len;
        }
      } while (last === 0);
      used -= s.strm.avail_in;
      if (used) {
        if (used >= s.w_size) {
          s.matches = 2;
          s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
          s.strstart = s.w_size;
          s.insert = s.strstart;
        } else {
          if (s.window_size - s.strstart <= used) {
            s.strstart -= s.w_size;
            s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
            if (s.matches < 2) {
              s.matches++;
            }
            if (s.insert > s.strstart) {
              s.insert = s.strstart;
            }
          }
          s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
          s.strstart += used;
          s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
        }
        s.block_start = s.strstart;
      }
      if (s.high_water < s.strstart) {
        s.high_water = s.strstart;
      }
      if (last) {
        return BS_FINISH_DONE;
      }
      if (flush !== Z_NO_FLUSH && flush !== Z_FINISH && s.strm.avail_in === 0 && s.strstart === s.block_start) {
        return BS_BLOCK_DONE;
      }
      have = s.window_size - s.strstart;
      if (s.strm.avail_in > have && s.block_start >= s.w_size) {
        s.block_start -= s.w_size;
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
          s.matches++;
        }
        have += s.w_size;
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
      }
      if (have > s.strm.avail_in) {
        have = s.strm.avail_in;
      }
      if (have) {
        read_buf(s.strm, s.window, s.strstart, have);
        s.strstart += have;
        s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
      }
      if (s.high_water < s.strstart) {
        s.high_water = s.strstart;
      }
      have = s.bi_valid + 42 >> 3;
      have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
      min_block = have > s.w_size ? s.w_size : have;
      left = s.strstart - s.block_start;
      if (left >= min_block || (left || flush === Z_FINISH) && flush !== Z_NO_FLUSH && s.strm.avail_in === 0 && left <= have) {
        len = left > have ? have : left;
        last = flush === Z_FINISH && s.strm.avail_in === 0 && len === left ? 1 : 0;
        _tr_stored_block(s, s.block_start, len, last);
        s.block_start += len;
        flush_pending(s.strm);
      }
      return last ? BS_FINISH_STARTED : BS_NEED_MORE;
    };
    var deflate_fast = (s, flush) => {
      let hash_head;
      let bflush;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
            s.match_length--;
            do {
              s.strstart++;
              s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
          }
        } else {
          bflush = _tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_slow = (s, flush) => {
      let hash_head;
      let bflush;
      let max_insert;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
          if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
            s.match_length = MIN_MATCH - 1;
          }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s.match_available) {
          bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
          if (bflush) {
            flush_block_only(s, false);
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      if (s.match_available) {
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_rle = (s, flush) => {
      let bflush;
      let prev;
      let scan, strend;
      const _win = s.window;
      for (; ; ) {
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          bflush = _tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    var deflate_huff = (s, flush) => {
      let bflush;
      for (; ; ) {
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s.match_length = 0;
        bflush = _tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.sym_next) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    };
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored),
      /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast),
      /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast),
      /* 2 */
      new Config(4, 6, 32, 32, deflate_fast),
      /* 3 */
      new Config(4, 4, 16, 16, deflate_slow),
      /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow),
      /* 5 */
      new Config(8, 16, 128, 128, deflate_slow),
      /* 6 */
      new Config(8, 32, 128, 256, deflate_slow),
      /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow),
      /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow)
      /* 9 max compression */
    ];
    var lm_init = (s) => {
      s.window_size = 2 * s.w_size;
      zero(s.head);
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;
      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    };
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
      this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
      this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new Uint16Array(MAX_BITS + 1);
      this.heap = new Uint16Array(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new Uint16Array(2 * L_CODES + 1);
      zero(this.depth);
      this.sym_buf = 0;
      this.lit_bufsize = 0;
      this.sym_next = 0;
      this.sym_end = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    var deflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const s = strm.state;
      if (!s || s.strm !== strm || s.status !== INIT_STATE && //#ifdef GZIP
      s.status !== GZIP_STATE && //#endif
      s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) {
        return 1;
      }
      return 0;
    };
    var deflateResetKeep = (strm) => {
      if (deflateStateCheck(strm)) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      const s = strm.state;
      s.pending = 0;
      s.pending_out = 0;
      if (s.wrap < 0) {
        s.wrap = -s.wrap;
      }
      s.status = //#ifdef GZIP
      s.wrap === 2 ? GZIP_STATE : (
        //#endif
        s.wrap ? INIT_STATE : BUSY_STATE
      );
      strm.adler = s.wrap === 2 ? 0 : 1;
      s.last_flush = -2;
      _tr_init(s);
      return Z_OK;
    };
    var deflateReset = (strm) => {
      const ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    };
    var deflateSetHeader = (strm, head) => {
      if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    };
    var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      let wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
        return err(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      const s = new DeflateState();
      strm.state = s;
      s.strm = strm;
      s.status = INIT_STATE;
      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;
      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s.window = new Uint8Array(s.w_size * 2);
      s.head = new Uint16Array(s.hash_size);
      s.prev = new Uint16Array(s.w_size);
      s.lit_bufsize = 1 << memLevel + 6;
      s.pending_buf_size = s.lit_bufsize * 4;
      s.pending_buf = new Uint8Array(s.pending_buf_size);
      s.sym_buf = s.lit_bufsize;
      s.sym_end = (s.lit_bufsize - 1) * 3;
      s.level = level;
      s.strategy = strategy;
      s.method = method;
      return deflateReset(strm);
    };
    var deflateInit = (strm, level) => {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    };
    var deflate = (strm, flush) => {
      if (deflateStateCheck(strm) || flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      const s = strm.state;
      if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== Z_FINISH) {
        return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      const old_flush = s.last_flush;
      s.last_flush = flush;
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s.status === INIT_STATE && s.wrap === 0) {
        s.status = BUSY_STATE;
      }
      if (s.status === INIT_STATE) {
        let header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
        let level_flags = -1;
        if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
          level_flags = 0;
        } else if (s.level < 6) {
          level_flags = 1;
        } else if (s.level === 6) {
          level_flags = 2;
        } else {
          level_flags = 3;
        }
        header |= level_flags << 6;
        if (s.strstart !== 0) {
          header |= PRESET_DICT;
        }
        header += 31 - header % 31;
        putShortMSB(s, header);
        if (s.strstart !== 0) {
          putShortMSB(s, strm.adler >>> 16);
          putShortMSB(s, strm.adler & 65535);
        }
        strm.adler = 1;
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
      if (s.status === GZIP_STATE) {
        strm.adler = 0;
        put_byte(s, 31);
        put_byte(s, 139);
        put_byte(s, 8);
        if (!s.gzhead) {
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, OS_CODE);
          s.status = BUSY_STATE;
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        } else {
          put_byte(
            s,
            (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
          );
          put_byte(s, s.gzhead.time & 255);
          put_byte(s, s.gzhead.time >> 8 & 255);
          put_byte(s, s.gzhead.time >> 16 & 255);
          put_byte(s, s.gzhead.time >> 24 & 255);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, s.gzhead.os & 255);
          if (s.gzhead.extra && s.gzhead.extra.length) {
            put_byte(s, s.gzhead.extra.length & 255);
            put_byte(s, s.gzhead.extra.length >> 8 & 255);
          }
          if (s.gzhead.hcrc) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
          }
          s.gzindex = 0;
          s.status = EXTRA_STATE;
        }
      }
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
          let beg = s.pending;
          let left = (s.gzhead.extra.length & 65535) - s.gzindex;
          while (s.pending + left > s.pending_buf_size) {
            let copy = s.pending_buf_size - s.pending;
            s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
            s.pending = s.pending_buf_size;
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            s.gzindex += copy;
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK;
            }
            beg = 0;
            left -= copy;
          }
          let gzhead_extra = new Uint8Array(s.gzhead.extra);
          s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
          s.pending += left;
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.gzindex = 0;
        }
        s.status = NAME_STATE;
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
          let beg = s.pending;
          let val;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          s.gzindex = 0;
        }
        s.status = COMMENT_STATE;
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
          let beg = s.pending;
          let val;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              if (s.pending !== 0) {
                s.last_flush = -1;
                return Z_OK;
              }
              beg = 0;
            }
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
        }
        s.status = HCRC_STATE;
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
            if (s.pending !== 0) {
              s.last_flush = -1;
              return Z_OK;
            }
          }
          put_byte(s, strm.adler & 255);
          put_byte(s, strm.adler >> 8 & 255);
          strm.adler = 0;
        }
        s.status = BUSY_STATE;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
      if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
        let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            _tr_align(s);
          } else if (flush !== Z_BLOCK) {
            _tr_stored_block(s, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s.head);
              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        put_byte(s, strm.adler >> 16 & 255);
        put_byte(s, strm.adler >> 24 & 255);
        put_byte(s, strm.total_in & 255);
        put_byte(s, strm.total_in >> 8 & 255);
        put_byte(s, strm.total_in >> 16 & 255);
        put_byte(s, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    };
    var deflateEnd = (strm) => {
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const status = strm.state.status;
      strm.state = null;
      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    };
    var deflateSetDictionary = (strm, dictionary) => {
      let dictLength = dictionary.length;
      if (deflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const s = strm.state;
      const wrap = s.wrap;
      if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s.wrap = 0;
      if (dictLength >= s.w_size) {
        if (wrap === 0) {
          zero(s.head);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        let tmpDict = new Uint8Array(s.w_size);
        tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      const avail = strm.avail_in;
      const next = strm.next_in;
      const input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH) {
        let str = s.strstart;
        let n = s.lookahead - (MIN_MATCH - 1);
        do {
          s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    };
    module.exports.deflateInit = deflateInit;
    module.exports.deflateInit2 = deflateInit2;
    module.exports.deflateReset = deflateReset;
    module.exports.deflateResetKeep = deflateResetKeep;
    module.exports.deflateSetHeader = deflateSetHeader;
    module.exports.deflate = deflate;
    module.exports.deflateEnd = deflateEnd;
    module.exports.deflateSetDictionary = deflateSetDictionary;
    module.exports.deflateInfo = "pako deflate (from Nodeca project)";
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/utils/common.js
var require_common = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/utils/common.js"(exports, module) {
    "use strict";
    var _has = (obj, key) => {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
    module.exports.assign = function(obj) {
      const sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        const source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (const p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    module.exports.flattenChunks = (chunks) => {
      let len = 0;
      for (let i = 0, l = chunks.length; i < l; i++) {
        len += chunks[i].length;
      }
      const result = new Uint8Array(len);
      for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
        let chunk = chunks[i];
        result.set(chunk, pos);
        pos += chunk.length;
      }
      return result;
    };
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/utils/strings.js"(exports, module) {
    "use strict";
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new Uint8Array(256);
    for (let q = 0; q < 256; q++) {
      _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
    }
    _utf8len[254] = _utf8len[254] = 1;
    module.exports.string2buf = (str) => {
      if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
        return new TextEncoder().encode(str);
      }
      let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      buf = new Uint8Array(buf_len);
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i++] = c;
        } else if (c < 2048) {
          buf[i++] = 192 | c >>> 6;
          buf[i++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i++] = 224 | c >>> 12;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        } else {
          buf[i++] = 240 | c >>> 18;
          buf[i++] = 128 | c >>> 12 & 63;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        }
      }
      return buf;
    };
    var buf2binstring = (buf, len) => {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK) {
          return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
        }
      }
      let result = "";
      for (let i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    };
    module.exports.buf2string = (buf, max) => {
      const len = max || buf.length;
      if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
        return new TextDecoder().decode(buf.subarray(0, max));
      }
      let i, out;
      const utf16buf = new Array(len * 2);
      for (out = 0, i = 0; i < len; ) {
        let c = buf[i++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        let c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i < len) {
          c = c << 6 | buf[i++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    module.exports.utf8border = (buf, max) => {
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      let pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/zstream.js"(exports, module) {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module.exports = ZStream;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/deflate.js"(exports, module) {
    "use strict";
    var zlib_deflate = require_deflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_SYNC_FLUSH,
      Z_FULL_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_DEFAULT_COMPRESSION,
      Z_DEFAULT_STRATEGY,
      Z_DEFLATED
    } = require_constants();
    function Deflate(options) {
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY
      }, options || {});
      let opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_deflate.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        let dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      let status, _flush_mode;
      if (this.ended) {
        return false;
      }
      if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
      else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        status = zlib_deflate.deflate(strm, _flush_mode);
        if (status === Z_STREAM_END) {
          if (strm.next_out > 0) {
            this.onData(strm.output.subarray(0, strm.next_out));
          }
          status = zlib_deflate.deflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return status === Z_OK;
        }
        if (strm.avail_out === 0) {
          this.onData(strm.output);
          continue;
        }
        if (_flush_mode > 0 && strm.next_out > 0) {
          this.onData(strm.output.subarray(0, strm.next_out));
          strm.avail_out = 0;
          continue;
        }
        if (strm.avail_in === 0) break;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        this.result = utils.flattenChunks(this.chunks);
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      const deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    module.exports.Deflate = Deflate;
    module.exports.deflate = deflate;
    module.exports.deflateRaw = deflateRaw;
    module.exports.gzip = gzip;
    module.exports.constants = require_constants();
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/inffast.js"(exports, module) {
    "use strict";
    var BAD = 16209;
    var TYPE = 16191;
    module.exports = function inflate_fast(strm, start) {
      let _in;
      let last;
      let _out;
      let beg;
      let end;
      let dmax;
      let wsize;
      let whave;
      let wnext;
      let s_window;
      let hold;
      let bits;
      let lcode;
      let dcode;
      let lmask;
      let dmask;
      let here;
      let op;
      let len;
      let dist;
      let from;
      let from_source;
      let input, output;
      const state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits -= op;
                }
                if (bits < 15) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                        if (bits < op) {
                          hold += input[_in++] << bits;
                          bits += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits;
      return;
    };
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/inftrees.js"(exports, module) {
    "use strict";
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = new Uint16Array([
      /* Length codes 257..285 base */
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ]);
    var lext = new Uint8Array([
      /* Length codes 257..285 extra */
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ]);
    var dbase = new Uint16Array([
      /* Distance codes 0..29 base */
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ]);
    var dext = new Uint8Array([
      /* Distance codes 0..29 extra */
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ]);
    var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
      const bits = opts.bits;
      let len = 0;
      let sym = 0;
      let min = 0, max = 0;
      let root = 0;
      let curr = 0;
      let drop = 0;
      let left = 0;
      let used = 0;
      let huff = 0;
      let incr;
      let fill;
      let low;
      let mask;
      let next;
      let base = null;
      let match;
      const count = new Uint16Array(MAXBITS + 1);
      const offs = new Uint16Array(MAXBITS + 1);
      let extra = null;
      let here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        match = 20;
      } else if (type === LENS) {
        base = lbase;
        extra = lext;
        match = 257;
      } else {
        base = dbase;
        extra = dext;
        match = 0;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] + 1 < match) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] >= match) {
          here_op = extra[work[sym] - match];
          here_val = base[work[sym] - match];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
    module.exports = inflate_table;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/inflate.js"(exports, module) {
    "use strict";
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var {
      Z_FINISH,
      Z_BLOCK,
      Z_TREES,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR,
      Z_BUF_ERROR,
      Z_DEFLATED
    } = require_constants();
    var HEAD = 16180;
    var FLAGS = 16181;
    var TIME = 16182;
    var OS = 16183;
    var EXLEN = 16184;
    var EXTRA = 16185;
    var NAME = 16186;
    var COMMENT = 16187;
    var HCRC = 16188;
    var DICTID = 16189;
    var DICT = 16190;
    var TYPE = 16191;
    var TYPEDO = 16192;
    var STORED = 16193;
    var COPY_ = 16194;
    var COPY = 16195;
    var TABLE = 16196;
    var LENLENS = 16197;
    var CODELENS = 16198;
    var LEN_ = 16199;
    var LEN = 16200;
    var LENEXT = 16201;
    var DIST = 16202;
    var DISTEXT = 16203;
    var MATCH = 16204;
    var LIT = 16205;
    var CHECK = 16206;
    var LENGTH = 16207;
    var DONE = 16208;
    var BAD = 16209;
    var MEM = 16210;
    var SYNC = 16211;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    var zswap32 = (q) => {
      return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
    };
    function InflateState() {
      this.strm = null;
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new Uint16Array(320);
      this.work = new Uint16Array(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    var inflateStateCheck = (strm) => {
      if (!strm) {
        return 1;
      }
      const state = strm.state;
      if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
        return 1;
      }
      return 0;
    };
    var inflateResetKeep = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.flags = -1;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
      state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    };
    var inflateReset = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    };
    var inflateReset2 = (strm, windowBits) => {
      let wrap;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 5;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    };
    var inflateInit2 = (strm, windowBits) => {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      const state = new InflateState();
      strm.state = state;
      state.strm = strm;
      state.window = null;
      state.mode = HEAD;
      const ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    };
    var inflateInit = (strm) => {
      return inflateInit2(strm, DEF_WBITS);
    };
    var virgin = true;
    var lenfix;
    var distfix;
    var fixedtables = (state) => {
      if (virgin) {
        lenfix = new Int32Array(512);
        distfix = new Int32Array(32);
        let sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    };
    var updatewindow = (strm, src, end, copy) => {
      let dist;
      const state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new Uint8Array(state.wsize);
      }
      if (copy >= state.wsize) {
        state.window.set(src.subarray(end - state.wsize, end), 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
        copy -= dist;
        if (copy) {
          state.window.set(src.subarray(end - copy, end), 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    };
    var inflate = (strm, flush) => {
      let state;
      let input, output;
      let next;
      let put;
      let have, left;
      let hold;
      let bits;
      let _in, _out;
      let copy;
      let from;
      let from_source;
      let here = 0;
      let here_bits, here_op, here_val;
      let last_bits, last_op, last_val;
      let len;
      let ret;
      const hbuf = new Uint8Array(4);
      let opts;
      let n;
      const order = (
        /* permutation of code lengths */
        new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
      );
      if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                if (state.wbits === 0) {
                  state.wbits = 15;
                }
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits = 0;
                state.mode = FLAGS;
                break;
              }
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || /* check if zlib header allowed */
              (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              }
              if (len > 15 || len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << state.wbits;
              state.flags = 0;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits = 0;
              break;
            case FLAGS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = TIME;
            /* falls through */
            case TIME:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = OS;
            /* falls through */
            case OS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512 && state.wrap & 4) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = EXLEN;
            /* falls through */
            case EXLEN:
              if (state.flags & 1024) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512 && state.wrap & 4) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            /* falls through */
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Uint8Array(state.head.extra_len);
                    }
                    state.head.extra.set(
                      input.subarray(
                        next,
                        // extra field is limited to 65536 bytes
                        // - no need for additional size check
                        next + copy
                      ),
                      /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                      len
                    );
                  }
                  if (state.flags & 512 && state.wrap & 4) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            /* falls through */
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            /* falls through */
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512 && state.wrap & 4) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            /* falls through */
            case HCRC:
              if (state.flags & 512) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (state.wrap & 4 && hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits = 0;
              state.mode = DICT;
            /* falls through */
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            /* falls through */
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case TYPEDO:
              if (state.last) {
                hold >>>= bits & 7;
                bits -= bits & 7;
                state.mode = CHECK;
                break;
              }
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits -= 2;
              break;
            case STORED:
              hold >>>= bits & 7;
              bits -= bits & 7;
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case COPY_:
              state.mode = COPY;
            /* falls through */
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                output.set(input.subarray(next, next + copy), put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            /* falls through */
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = { bits: state.lenbits };
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            /* falls through */
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n = here_bits + 2;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits -= 2;
                  } else if (here_val === 17) {
                    n = here_bits + 3;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits -= 3;
                  } else {
                    n = here_bits + 7;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = { bits: state.lenbits };
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = { bits: state.distbits };
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            /* falls through */
            case LEN_:
              state.mode = LEN;
            /* falls through */
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            /* falls through */
            case LENEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            /* falls through */
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            /* falls through */
            case DISTEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            /* falls through */
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits;
                  bits += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (state.wrap & 4 && _out) {
                  strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
                  state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = LENGTH;
            /* falls through */
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = DONE;
            /* falls through */
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            /* falls through */
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap & 4 && _out) {
        strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
        state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    };
    var inflateEnd = (strm) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      let state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    };
    var inflateGetHeader = (strm, head) => {
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      const state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    };
    var inflateSetDictionary = (strm, dictionary) => {
      const dictLength = dictionary.length;
      let state;
      let dictid;
      let ret;
      if (inflateStateCheck(strm)) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    };
    module.exports.inflateReset = inflateReset;
    module.exports.inflateReset2 = inflateReset2;
    module.exports.inflateResetKeep = inflateResetKeep;
    module.exports.inflateInit = inflateInit;
    module.exports.inflateInit2 = inflateInit2;
    module.exports.inflate = inflate;
    module.exports.inflateEnd = inflateEnd;
    module.exports.inflateGetHeader = inflateGetHeader;
    module.exports.inflateSetDictionary = inflateSetDictionary;
    module.exports.inflateInfo = "pako inflate (from Nodeca project)";
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/zlib/gzheader.js"(exports, module) {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module.exports = GZheader;
  }
});

// github-r14-stage/export-deps/node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/lib/inflate.js"(exports, module) {
    "use strict";
    var zlib_inflate = require_inflate();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    var {
      Z_NO_FLUSH,
      Z_FINISH,
      Z_OK,
      Z_STREAM_END,
      Z_NEED_DICT,
      Z_STREAM_ERROR,
      Z_DATA_ERROR,
      Z_MEM_ERROR
    } = require_constants();
    function Inflate(options) {
      this.options = utils.assign({
        chunkSize: 1024 * 64,
        windowBits: 15,
        to: ""
      }, options || {});
      const opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      let status = zlib_inflate.inflateInit2(
        this.strm,
        opt.windowBits
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, flush_mode) {
      const strm = this.strm;
      const chunkSize = this.options.chunkSize;
      const dictionary = this.options.dictionary;
      let status, _flush_mode, last_avail_out;
      if (this.ended) return false;
      if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
      else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      for (; ; ) {
        if (strm.avail_out === 0) {
          strm.output = new Uint8Array(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, _flush_mode);
        if (status === Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(strm, dictionary);
          if (status === Z_OK) {
            status = zlib_inflate.inflate(strm, _flush_mode);
          } else if (status === Z_DATA_ERROR) {
            status = Z_NEED_DICT;
          }
        }
        while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
          zlib_inflate.inflateReset(strm);
          status = zlib_inflate.inflate(strm, _flush_mode);
        }
        switch (status) {
          case Z_STREAM_ERROR:
          case Z_DATA_ERROR:
          case Z_NEED_DICT:
          case Z_MEM_ERROR:
            this.onEnd(status);
            this.ended = true;
            return false;
        }
        last_avail_out = strm.avail_out;
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === Z_STREAM_END) {
            if (this.options.to === "string") {
              let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              let tail = strm.next_out - next_out_utf8;
              let utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
              this.onData(utf8str);
            } else {
              this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
            }
          }
        }
        if (status === Z_OK && last_avail_out === 0) continue;
        if (status === Z_STREAM_END) {
          status = zlib_inflate.inflateEnd(this.strm);
          this.onEnd(status);
          this.ended = true;
          return true;
        }
        if (strm.avail_in === 0) break;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      const inflator = new Inflate(options);
      inflator.push(input);
      if (inflator.err) throw inflator.msg || msg[inflator.err];
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    module.exports.Inflate = Inflate;
    module.exports.inflate = inflate;
    module.exports.inflateRaw = inflateRaw;
    module.exports.ungzip = inflate;
    module.exports.constants = require_constants();
  }
});

// github-r14-stage/export-deps/node_modules/pako/index.js
var require_pako = __commonJS({
  "github-r14-stage/export-deps/node_modules/pako/index.js"(exports, module) {
    "use strict";
    var { Deflate, deflate, deflateRaw, gzip } = require_deflate2();
    var { Inflate, inflate, inflateRaw, ungzip } = require_inflate2();
    var constants = require_constants();
    module.exports.Deflate = Deflate;
    module.exports.deflate = deflate;
    module.exports.deflateRaw = deflateRaw;
    module.exports.gzip = gzip;
    module.exports.Inflate = Inflate;
    module.exports.inflate = inflate;
    module.exports.inflateRaw = inflateRaw;
    module.exports.ungzip = ungzip;
    module.exports.constants = constants;
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/jpeg.js
var require_jpeg = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/jpeg.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeJpeg = decodeJpeg;
    var dctZigZag = new Int32Array([
      0,
      1,
      8,
      16,
      9,
      2,
      3,
      10,
      17,
      24,
      32,
      25,
      18,
      11,
      4,
      5,
      12,
      19,
      26,
      33,
      40,
      48,
      41,
      34,
      27,
      20,
      13,
      6,
      7,
      14,
      21,
      28,
      35,
      42,
      49,
      56,
      57,
      50,
      43,
      36,
      29,
      22,
      15,
      23,
      30,
      37,
      44,
      51,
      58,
      59,
      52,
      45,
      38,
      31,
      39,
      46,
      53,
      60,
      61,
      54,
      47,
      55,
      62,
      63
    ]);
    var dctCos1 = 4017;
    var dctSin1 = 799;
    var dctCos3 = 3406;
    var dctSin3 = 2276;
    var dctCos6 = 1567;
    var dctSin6 = 3784;
    var dctSqrt2 = 5793;
    var dctSqrt1d2 = 2896;
    var maxResolutionInMP = 100;
    var maxMemoryUsageBytes = 64 * 1024 * 1024;
    var totalBytesAllocated = 0;
    var memoryLimitBytes = maxMemoryUsageBytes;
    function requestMemoryAllocation(increaseAmount) {
      if (!isFinite(increaseAmount) || increaseAmount < 0)
        throw new Error(`Invalid memory allocation size (${increaseAmount})`);
      const totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
      if (totalMemoryImpactBytes > memoryLimitBytes) {
        const exceededAmount = Math.ceil((totalMemoryImpactBytes - memoryLimitBytes) / 1024 / 1024);
        throw new Error(`Max memory limit exceeded by at least ${exceededAmount}MB`);
      }
      totalBytesAllocated = totalMemoryImpactBytes;
    }
    function buildHuffmanTable(codeLengths, values) {
      let length = 16;
      while (length > 0 && !codeLengths[length - 1])
        length--;
      const code = [{ children: [], index: 0 }];
      let k = 0;
      let p = code[0];
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < codeLengths[i]; j++) {
          p = code.pop();
          p.children[p.index] = values[k];
          while (p.index > 0) {
            if (code.length === 0)
              throw new Error("Could not recreate Huffman Table");
            p = code.pop();
          }
          p.index++;
          code.push(p);
          while (code.length <= i) {
            const q = { children: [], index: 0 };
            code.push(q);
            p.children[p.index] = q.children;
            p = q;
          }
          k++;
        }
        if (i + 1 < length) {
          const q = { children: [], index: 0 };
          code.push(q);
          p.children[p.index] = q.children;
          p = q;
        }
      }
      return code[0].children;
    }
    function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive) {
      const mcusPerLine = frame.mcusPerLine;
      const progressive = frame.progressive;
      const startOffset = offset;
      let bitsData = 0;
      let bitsCount = 0;
      function readBit() {
        if (bitsCount > 0) {
          bitsCount--;
          return bitsData >> bitsCount & 1;
        }
        bitsData = data[offset++];
        if (bitsData == 255) {
          const nextByte = data[offset++];
          if (nextByte)
            throw new Error(`unexpected marker: ${(bitsData << 8 | nextByte).toString(16)}`);
        }
        bitsCount = 7;
        return bitsData >>> 7;
      }
      function decodeHuffman(tree) {
        if (!tree)
          throw new Error("Missing Huffman table");
        let node = tree;
        while (true) {
          node = node[readBit()];
          if (typeof node === "number")
            return node;
          if (node === void 0)
            throw new Error("invalid huffman sequence");
        }
      }
      function receive(length) {
        let n = 0;
        while (length > 0) {
          n = n << 1 | readBit();
          length--;
        }
        return n;
      }
      function receiveAndExtend(length) {
        let n = receive(length);
        if (n >= 1 << length - 1)
          return n;
        return n + (-1 << length) + 1;
      }
      function decodeBaseline(component2, zz) {
        const t = decodeHuffman(component2.huffmanTableDC);
        const diff = t === 0 ? 0 : receiveAndExtend(t);
        zz[0] = component2.pred += diff;
        let k = 1;
        while (k < 64) {
          const rs = decodeHuffman(component2.huffmanTableAC);
          const s = rs & 15;
          const r = rs >> 4;
          if (s === 0) {
            if (r < 15)
              break;
            k += 16;
            continue;
          }
          k += r;
          const z = dctZigZag[k];
          zz[z] = receiveAndExtend(s);
          k++;
        }
      }
      function decodeDCFirst(component2, zz) {
        const t = decodeHuffman(component2.huffmanTableDC);
        const diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
        zz[0] = component2.pred += diff;
      }
      function decodeDCSuccessive(_component, zz) {
        zz[0] |= readBit() << successive;
      }
      let eobrun = 0;
      function decodeACFirst(component2, zz) {
        if (eobrun > 0) {
          eobrun--;
          return;
        }
        let k = spectralStart, e = spectralEnd;
        while (k <= e) {
          const rs = decodeHuffman(component2.huffmanTableAC);
          const s = rs & 15;
          const r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = receive(r) + (1 << r) - 1;
              break;
            }
            k += 16;
            continue;
          }
          k += r;
          const z = dctZigZag[k];
          zz[z] = receiveAndExtend(s) * (1 << successive);
          k++;
        }
      }
      let successiveACState = 0;
      let successiveACNextValue = 0;
      function decodeACSuccessive(component2, zz) {
        let k = spectralStart;
        let e = spectralEnd;
        let r = 0;
        while (k <= e) {
          const z = dctZigZag[k];
          const direction = zz[z] < 0 ? -1 : 1;
          switch (successiveACState) {
            case 0:
              const rs = decodeHuffman(component2.huffmanTableAC);
              const s = rs & 15;
              r = rs >> 4;
              if (s === 0) {
                if (r < 15) {
                  eobrun = receive(r) + (1 << r);
                  successiveACState = 4;
                } else {
                  r = 16;
                  successiveACState = 1;
                }
              } else {
                if (s !== 1)
                  throw new Error("invalid ACn encoding");
                successiveACNextValue = receiveAndExtend(s);
                successiveACState = r ? 2 : 3;
              }
              continue;
            case 1:
            // skipping r zero items
            case 2:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              } else {
                r--;
                if (r === 0)
                  successiveACState = successiveACState == 2 ? 3 : 0;
              }
              break;
            case 3:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              } else {
                zz[z] = successiveACNextValue << successive;
                successiveACState = 0;
              }
              break;
            case 4:
              if (zz[z]) {
                zz[z] += (readBit() << successive) * direction;
              }
              break;
          }
          k++;
        }
        if (successiveACState === 4) {
          eobrun--;
          if (eobrun === 0)
            successiveACState = 0;
        }
      }
      function decodeMcu(component2, decode, mcu2, row, col) {
        const mcuRow = mcu2 / mcusPerLine | 0;
        const mcuCol = mcu2 % mcusPerLine;
        const blockRow = mcuRow * component2.v + row;
        const blockCol = mcuCol * component2.h + col;
        if (component2.blocks[blockRow] === void 0)
          return;
        decode(component2, component2.blocks[blockRow][blockCol]);
      }
      function decodeBlock(component2, decode, mcu2) {
        const blockRow = mcu2 / component2.blocksPerLine | 0;
        const blockCol = mcu2 % component2.blocksPerLine;
        if (component2.blocks[blockRow] === void 0)
          return;
        decode(component2, component2.blocks[blockRow][blockCol]);
      }
      const componentsLength = components.length;
      let component;
      let decodeFn;
      if (progressive) {
        if (spectralStart === 0) {
          decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
        } else {
          decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        }
      } else {
        decodeFn = decodeBaseline;
      }
      let mcu = 0;
      let mcuExpected;
      if (componentsLength == 1) {
        mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
      } else {
        mcuExpected = mcusPerLine * frame.mcusPerColumn;
      }
      if (!isFinite(mcuExpected) || mcuExpected < 0)
        throw new Error("Invalid number of MCUs");
      if (!resetInterval)
        resetInterval = mcuExpected;
      let h;
      let v;
      let marker;
      while (mcu < mcuExpected) {
        for (let i = 0; i < componentsLength; i++)
          components[i].pred = 0;
        eobrun = 0;
        if (componentsLength == 1) {
          component = components[0];
          for (let n = 0; n < resetInterval; n++) {
            decodeBlock(component, decodeFn, mcu);
            mcu++;
            if (mcu === mcuExpected)
              break;
          }
        } else {
          for (let n = 0; n < resetInterval; n++) {
            for (let i = 0; i < componentsLength; i++) {
              component = components[i];
              h = component.h;
              v = component.v;
              for (let j = 0; j < v; j++) {
                for (let k = 0; k < h; k++) {
                  decodeMcu(component, decodeFn, mcu, j, k);
                }
              }
            }
            mcu++;
            if (mcu === mcuExpected)
              break;
          }
        }
        if (mcu === mcuExpected) {
          do {
            if (data[offset] === 255) {
              if (data[offset + 1] !== 0) {
                break;
              }
            }
            offset += 1;
          } while (offset < data.length - 2);
        }
        bitsCount = 0;
        marker = data[offset] << 8 | data[offset + 1];
        if (marker < 65280)
          throw new Error("marker was not found");
        if (marker >= 65488 && marker <= 65495) {
          offset += 2;
        } else {
          break;
        }
      }
      return offset - startOffset;
    }
    function buildComponentData(component) {
      const lines = [];
      const blocksPerLine = component.blocksPerLine;
      const blocksPerColumn = component.blocksPerColumn;
      const samplesPerLine = blocksPerLine << 3;
      const R = new Int32Array(64);
      const r = new Uint8Array(64);
      function quantizeAndInverse(zz, dataOut, dataIn) {
        const qt = component.quantizationTable;
        if (!qt)
          throw new Error("Missing quantization table");
        const p = dataIn;
        for (let i = 0; i < 64; i++) {
          p[i] = zz[i] * qt[i];
        }
        for (let i = 0; i < 8; ++i) {
          const row = 8 * i;
          if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
            const t2 = dctSqrt2 * p[0 + row] + 512 >> 10;
            p[0 + row] = t2;
            p[1 + row] = t2;
            p[2 + row] = t2;
            p[3 + row] = t2;
            p[4 + row] = t2;
            p[5 + row] = t2;
            p[6 + row] = t2;
            p[7 + row] = t2;
            continue;
          }
          let v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
          let v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
          let v2 = p[2 + row];
          let v3 = p[6 + row];
          let v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
          let v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
          let v5 = p[3 + row] << 4;
          let v6 = p[5 + row] << 4;
          let t = v0 - v1 + 1 >> 1;
          v0 = v0 + v1 + 1 >> 1;
          v1 = t;
          t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
          v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
          v3 = t;
          t = v4 - v6 + 1 >> 1;
          v4 = v4 + v6 + 1 >> 1;
          v6 = t;
          t = v7 + v5 + 1 >> 1;
          v5 = v7 - v5 + 1 >> 1;
          v7 = t;
          t = v0 - v3 + 1 >> 1;
          v0 = v0 + v3 + 1 >> 1;
          v3 = t;
          t = v1 - v2 + 1 >> 1;
          v1 = v1 + v2 + 1 >> 1;
          v2 = t;
          t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
          v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
          v7 = t;
          t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
          v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
          v6 = t;
          p[0 + row] = v0 + v7;
          p[7 + row] = v0 - v7;
          p[1 + row] = v1 + v6;
          p[6 + row] = v1 - v6;
          p[2 + row] = v2 + v5;
          p[5 + row] = v2 - v5;
          p[3 + row] = v3 + v4;
          p[4 + row] = v3 - v4;
        }
        for (let i = 0; i < 8; ++i) {
          const col = i;
          if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
            const t2 = dctSqrt2 * dataIn[i + 0] + 8192 >> 14;
            p[0 * 8 + col] = t2;
            p[1 * 8 + col] = t2;
            p[2 * 8 + col] = t2;
            p[3 * 8 + col] = t2;
            p[4 * 8 + col] = t2;
            p[5 * 8 + col] = t2;
            p[6 * 8 + col] = t2;
            p[7 * 8 + col] = t2;
            continue;
          }
          let v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
          let v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
          let v2 = p[2 * 8 + col];
          let v3 = p[6 * 8 + col];
          let v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
          let v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
          let v5 = p[3 * 8 + col];
          let v6 = p[5 * 8 + col];
          let t = v0 - v1 + 1 >> 1;
          v0 = v0 + v1 + 1 >> 1;
          v1 = t;
          t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
          v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
          v3 = t;
          t = v4 - v6 + 1 >> 1;
          v4 = v4 + v6 + 1 >> 1;
          v6 = t;
          t = v7 + v5 + 1 >> 1;
          v5 = v7 - v5 + 1 >> 1;
          v7 = t;
          t = v0 - v3 + 1 >> 1;
          v0 = v0 + v3 + 1 >> 1;
          v3 = t;
          t = v1 - v2 + 1 >> 1;
          v1 = v1 + v2 + 1 >> 1;
          v2 = t;
          t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
          v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
          v7 = t;
          t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
          v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
          v6 = t;
          p[0 * 8 + col] = v0 + v7;
          p[7 * 8 + col] = v0 - v7;
          p[1 * 8 + col] = v1 + v6;
          p[6 * 8 + col] = v1 - v6;
          p[2 * 8 + col] = v2 + v5;
          p[5 * 8 + col] = v2 - v5;
          p[3 * 8 + col] = v3 + v4;
          p[4 * 8 + col] = v3 - v4;
        }
        for (let i = 0; i < 64; ++i) {
          const sample = 128 + (p[i] + 8 >> 4);
          dataOut[i] = sample < 0 ? 0 : sample > 255 ? 255 : sample;
        }
      }
      requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
      for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
        const scanLine = blockRow << 3;
        for (let i = 0; i < 8; i++)
          lines.push(new Uint8Array(samplesPerLine));
        for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
          quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
          let offset = 0;
          const sample = blockCol << 3;
          for (let j = 0; j < 8; j++) {
            const line = lines[scanLine + j];
            for (let i = 0; i < 8; i++)
              line[sample + i] = r[offset++];
          }
        }
      }
      return lines;
    }
    function clampTo8bit(a) {
      return a < 0 ? 0 : a > 255 ? 255 : a;
    }
    function parse(data) {
      const self = {
        width: 0,
        height: 0,
        adobe: void 0,
        components: [],
        exifBuffer: void 0,
        jfif: void 0
      };
      const maxResolutionInPixels = maxResolutionInMP * 1e3 * 1e3;
      let offset = 0;
      function readUint16() {
        const value = data[offset] << 8 | data[offset + 1];
        offset += 2;
        return value;
      }
      function readDataBlock() {
        const length = readUint16();
        const array = data.subarray(offset, offset + length - 2);
        offset += array.length;
        return array;
      }
      function prepareComponents(frame2) {
        let maxH = 0, maxV = 0;
        for (let componentId in frame2.components) {
          if (frame2.components.hasOwnProperty(componentId)) {
            const component = frame2.components[componentId];
            if (maxH < component.h)
              maxH = component.h;
            if (maxV < component.v)
              maxV = component.v;
          }
        }
        const mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH);
        const mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV);
        for (let componentId in frame2.components) {
          if (frame2.components.hasOwnProperty(componentId)) {
            const component = frame2.components[componentId];
            const blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component.h / maxH);
            const blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component.v / maxV);
            const blocksPerLineForMcu = mcusPerLine * component.h;
            const blocksPerColumnForMcu = mcusPerColumn * component.v;
            const blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
            const blocks = [];
            requestMemoryAllocation(blocksToAllocate * 256);
            for (let i = 0; i < blocksPerColumnForMcu; i++) {
              const row = [];
              for (let j = 0; j < blocksPerLineForMcu; j++) {
                row.push(new Int32Array(64));
              }
              blocks.push(row);
            }
            component.blocksPerLine = blocksPerLine;
            component.blocksPerColumn = blocksPerColumn;
            component.blocks = blocks;
          }
        }
        frame2.maxH = maxH;
        frame2.maxV = maxV;
        frame2.mcusPerLine = mcusPerLine;
        frame2.mcusPerColumn = mcusPerColumn;
      }
      let jfif = null;
      let adobe = null;
      let frame = void 0;
      let resetInterval = 0;
      let quantizationTables = [];
      let frames = [];
      let huffmanTablesAC = [];
      let huffmanTablesDC = [];
      let fileMarker = readUint16();
      let malformedDataOffset = -1;
      if (fileMarker != 65496) {
        throw new Error("SOI not found");
      }
      fileMarker = readUint16();
      while (fileMarker != 65497) {
        switch (fileMarker) {
          case 65280:
            break;
          case 65504:
          // APP0 (Application Specific)
          case 65505:
          // APP1
          case 65506:
          // APP2
          case 65507:
          // APP3
          case 65508:
          // APP4
          case 65509:
          // APP5
          case 65510:
          // APP6
          case 65511:
          // APP7
          case 65512:
          // APP8
          case 65513:
          // APP9
          case 65514:
          // APP10
          case 65515:
          // APP11
          case 65516:
          // APP12
          case 65517:
          // APP13
          case 65518:
          // APP14
          case 65519:
          // APP15
          case 65534: {
            const appData = readDataBlock();
            if (fileMarker === 65534) {
            }
            if (fileMarker === 65504) {
              if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                jfif = {
                  version: { major: appData[5], minor: appData[6] },
                  densityUnits: appData[7],
                  xDensity: appData[8] << 8 | appData[9],
                  yDensity: appData[10] << 8 | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                };
              }
            }
            if (fileMarker === 65505) {
              if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                self.exifBuffer = appData.subarray(5, appData.length);
              }
            }
            if (fileMarker === 65518) {
              if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                adobe = {
                  version: appData[6],
                  flags0: appData[7] << 8 | appData[8],
                  flags1: appData[9] << 8 | appData[10],
                  transformCode: appData[11]
                };
              }
            }
            break;
          }
          case 65499: {
            const quantizationTablesLength = readUint16();
            const quantizationTablesEnd = quantizationTablesLength + offset - 2;
            while (offset < quantizationTablesEnd) {
              const quantizationTableSpec = data[offset++];
              requestMemoryAllocation(64 * 4);
              const tableData = new Int32Array(64);
              if (quantizationTableSpec >> 4 === 0) {
                for (let j = 0; j < 64; j++) {
                  const z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if (quantizationTableSpec >> 4 === 1) {
                for (let j = 0; j < 64; j++) {
                  const z = dctZigZag[j];
                  tableData[z] = readUint16();
                }
              } else
                throw new Error("DQT: invalid table spec");
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;
          }
          case 65472:
          // SOF0 (Start of Frame, Baseline DCT)
          case 65473:
          // SOF1 (Start of Frame, Extended DCT)
          case 65474: {
            readUint16();
            frame = {
              extended: fileMarker === 65473,
              progressive: fileMarker === 65474,
              precision: data[offset++],
              scanLines: readUint16(),
              samplesPerLine: readUint16(),
              components: {},
              componentsOrder: [],
              maxH: 0,
              maxV: 0,
              mcusPerLine: 0,
              mcusPerColumn: 0
            };
            const pixelsInFrame = frame.scanLines * frame.samplesPerLine;
            if (pixelsInFrame > maxResolutionInPixels) {
              const exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
              throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
            }
            const componentsCount = data[offset++];
            if (!componentsCount)
              throw new Error("SOF: no components in frame");
            for (let i = 0; i < componentsCount; i++) {
              const componentId = data[offset];
              const h = data[offset + 1] >> 4;
              const v = data[offset + 1] & 15;
              if (h < 1 || h > 4 || v < 1 || v > 4)
                throw new Error(`SOF: invalid sampling factors (${h}x${v})`);
              const qId = data[offset + 2];
              frame.componentsOrder.push(componentId);
              frame.components[componentId] = {
                h,
                v,
                quantizationIdx: qId,
                blocksPerColumn: 0,
                blocksPerLine: 0,
                blocks: [],
                pred: 0
              };
              offset += 3;
            }
            prepareComponents(frame);
            frames.push(frame);
            break;
          }
          case 65476: {
            const huffmanLength = readUint16();
            for (let i = 2; i < huffmanLength; ) {
              const huffmanTableSpec = data[offset++];
              const codeLengths = new Uint8Array(16);
              let codeLengthSum = 0;
              for (let j = 0; j < 16; j++, offset++) {
                codeLengthSum += codeLengths[j] = data[offset];
              }
              requestMemoryAllocation(16 + codeLengthSum);
              const huffmanValues = new Uint8Array(codeLengthSum);
              for (let j = 0; j < codeLengthSum; j++, offset++) {
                huffmanValues[j] = data[offset];
              }
              i += 17 + codeLengthSum;
              const index = huffmanTableSpec & 15;
              const table = huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC;
              table[index] = buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;
          }
          case 65501:
            readUint16();
            resetInterval = readUint16();
            break;
          case 65500:
            readUint16();
            readUint16();
            break;
          case 65498: {
            if (!frame)
              throw new Error("SOS: scan before frame header (SOF)");
            readUint16();
            const selectorsCount = data[offset++];
            const components = [];
            for (let i = 0; i < selectorsCount; i++) {
              const componentId = data[offset++];
              const component = frame.components[componentId];
              if (!component)
                throw new Error(`SOS: component ${componentId} not found in frame`);
              const tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            const spectralStart = data[offset++];
            const spectralEnd = data[offset++];
            const successiveApproximation = data[offset++];
            const processed = decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15);
            offset += processed;
            break;
          }
          case 65535:
            if (data[offset] !== 255) {
              offset--;
            }
            break;
          default: {
            if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
              offset -= 3;
              break;
            } else if (fileMarker === 224 || fileMarker == 225) {
              if (malformedDataOffset !== -1) {
                throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
              }
              malformedDataOffset = offset - 1;
              const nextOffset = readUint16();
              if (data[offset + nextOffset - 2] === 255) {
                offset += nextOffset - 2;
                break;
              }
            }
            throw new Error("unknown JPEG marker " + fileMarker.toString(16));
          }
        }
        fileMarker = readUint16();
      }
      if (frames.length != 1)
        throw new Error("only single frame JPEGs supported");
      for (let i = 0; i < frames.length; i++) {
        const cp = frames[i].components;
        for (const key of Object.keys(cp)) {
          const component = cp[+key];
          const table = quantizationTables[component.quantizationIdx];
          if (!table)
            throw new Error(`Missing quantization table ${component.quantizationIdx}`);
          component.quantizationTable = table;
        }
      }
      self.width = frame.samplesPerLine;
      self.height = frame.scanLines;
      self.jfif = jfif;
      self.adobe = adobe;
      self.components = [];
      for (let i = 0; i < frame.componentsOrder.length; i++) {
        const component = frame.components[frame.componentsOrder[i]];
        self.components.push({
          lines: buildComponentData(component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV
        });
      }
      return self;
    }
    function getData(decoded) {
      let offset = 0;
      let colorTransform = false;
      const width = decoded.width;
      const height = decoded.height;
      const dataLength = width * height * decoded.components.length;
      requestMemoryAllocation(dataLength);
      const data = new Uint8Array(dataLength);
      switch (decoded.components.length) {
        case 1: {
          const component1 = decoded.components[0];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            for (let x = 0; x < width; x++) {
              const Y = component1Line[0 | x * component1.scaleX];
              data[offset++] = Y;
            }
          }
          break;
        }
        case 2: {
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            for (let x = 0; x < width; x++) {
              const Y1 = component1Line[0 | x * component1.scaleX];
              data[offset++] = Y1;
              const Y2 = component2Line[0 | x * component2.scaleX];
              data[offset++] = Y2;
            }
          }
          break;
        }
        case 3: {
          colorTransform = decoded.jfif ? true : decoded.adobe ? !!decoded.adobe.transformCode : true;
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          const component3 = decoded.components[2];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            const component3Line = component3.lines[0 | y * component3.scaleY];
            for (let x = 0; x < width; x++) {
              let Y, Cb, Cr, R, G, B;
              if (!colorTransform) {
                R = component1Line[0 | x * component1.scaleX];
                G = component2Line[0 | x * component2.scaleX];
                B = component3Line[0 | x * component3.scaleX];
              } else {
                Y = component1Line[0 | x * component1.scaleX];
                Cb = component2Line[0 | x * component2.scaleX];
                Cr = component3Line[0 | x * component3.scaleX];
                R = clampTo8bit(Y + 1.402 * (Cr - 128));
                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                B = clampTo8bit(Y + 1.772 * (Cb - 128));
              }
              data[offset++] = R;
              data[offset++] = G;
              data[offset++] = B;
            }
          }
          break;
        }
        case 4: {
          if (!decoded.adobe)
            throw new Error("Unsupported color mode (4 components)");
          colorTransform = false;
          if (decoded.adobe && decoded.adobe.transformCode)
            colorTransform = true;
          const component1 = decoded.components[0];
          const component2 = decoded.components[1];
          const component3 = decoded.components[2];
          const component4 = decoded.components[3];
          for (let y = 0; y < height; y++) {
            const component1Line = component1.lines[0 | y * component1.scaleY];
            const component2Line = component2.lines[0 | y * component2.scaleY];
            const component3Line = component3.lines[0 | y * component3.scaleY];
            const component4Line = component4.lines[0 | y * component4.scaleY];
            for (let x = 0; x < width; x++) {
              let Y, Cb, Cr, K, C, M, Ye;
              if (!colorTransform) {
                C = component1Line[0 | x * component1.scaleX];
                M = component2Line[0 | x * component2.scaleX];
                Ye = component3Line[0 | x * component3.scaleX];
                K = component4Line[0 | x * component4.scaleX];
              } else {
                Y = component1Line[0 | x * component1.scaleX];
                Cb = component2Line[0 | x * component2.scaleX];
                Cr = component3Line[0 | x * component3.scaleX];
                K = component4Line[0 | x * component4.scaleX];
                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
              }
              data[offset++] = 255 - C;
              data[offset++] = 255 - M;
              data[offset++] = 255 - Ye;
              data[offset++] = 255 - K;
            }
          }
          break;
        }
        default:
          throw new Error("Unsupported color mode");
      }
      return data;
    }
    function decodeJpeg(encoded, createImageData, memoryLimit) {
      totalBytesAllocated = 0;
      memoryLimitBytes = memoryLimit === void 0 ? maxMemoryUsageBytes : Math.min(maxMemoryUsageBytes, Math.max(0, memoryLimit));
      if (encoded.length === 0)
        throw new Error("Empty jpeg buffer");
      const decoded = parse(encoded);
      requestMemoryAllocation(decoded.width * decoded.height * 4);
      const data = getData(decoded);
      const imageData = createImageData(decoded.width, decoded.height);
      const width = imageData.width;
      const height = imageData.height;
      const imageDataArray = imageData.data;
      let i = 0;
      let j = 0;
      switch (decoded.components.length) {
        case 1:
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const Y = data[i++];
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 2:
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const Y = data[i++];
              const A = data[i++];
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = A;
            }
          }
          break;
        case 3:
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const R = data[i++];
              const G = data[i++];
              const B = data[i++];
              imageDataArray[j++] = R;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 4:
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const C = data[i++];
              const M = data[i++];
              const Y = data[i++];
              const K = data[i++];
              const R = 255 - clampTo8bit(C * (1 - K / 255) + K);
              const G = 255 - clampTo8bit(M * (1 - K / 255) + K);
              const B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
              imageDataArray[j++] = R;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        default:
          throw new Error("Unsupported color mode");
      }
      return imageData;
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/helpers.js
var require_helpers = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createImageData = exports.createCanvas = exports.MaskParams = exports.LayerMaskFlags = exports.ColorSpace = exports.largeAdditionalInfoKeys = exports.largeAdditionalInfoKeysObserved = exports.layerColors = exports.toBlendMode = exports.fromBlendMode = exports.MOCK_HANDLERS = void 0;
    exports.createEnum = createEnum;
    exports.offsetForChannel = offsetForChannel;
    exports.normalizeLabAB = normalizeLabAB;
    exports.denormalizeLabAB = denormalizeLabAB;
    exports.clamp = clamp;
    exports.hasAlpha = hasAlpha;
    exports.cmykToRgbValues = cmykToRgbValues;
    exports.rgbToCmykValues = rgbToCmykValues;
    exports.resetImageData = resetImageData;
    exports.imageDataToCanvas = imageDataToCanvas;
    exports.decodeBitmap = decodeBitmap;
    exports.writeDataRaw = writeDataRaw;
    exports.writeDataRLE = writeDataRLE;
    exports.planarToBytes = planarToBytes;
    exports.writeDataRLEBytes = writeDataRLEBytes;
    exports.writeDataZipWithPrediction = writeDataZipWithPrediction;
    exports.writeDataZipWithoutPrediction = writeDataZipWithoutPrediction;
    exports.createCanvasFromData = createCanvasFromData;
    exports.initializeCanvas = initializeCanvas;
    var pako_1 = require_pako();
    var jpeg_1 = require_jpeg();
    exports.MOCK_HANDLERS = false;
    exports.fromBlendMode = {};
    exports.toBlendMode = {
      "pass": "pass through",
      "norm": "normal",
      "diss": "dissolve",
      "dark": "darken",
      "mul ": "multiply",
      "idiv": "color burn",
      "lbrn": "linear burn",
      "dkCl": "darker color",
      "lite": "lighten",
      "scrn": "screen",
      "div ": "color dodge",
      "lddg": "linear dodge",
      "lgCl": "lighter color",
      "over": "overlay",
      "sLit": "soft light",
      "hLit": "hard light",
      "vLit": "vivid light",
      "lLit": "linear light",
      "pLit": "pin light",
      "hMix": "hard mix",
      "diff": "difference",
      "smud": "exclusion",
      "fsub": "subtract",
      "fdiv": "divide",
      "hue ": "hue",
      "sat ": "saturation",
      "colr": "color",
      "lum ": "luminosity"
    };
    Object.keys(exports.toBlendMode).forEach((key) => exports.fromBlendMode[exports.toBlendMode[key]] = key);
    exports.layerColors = [
      "none",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "violet",
      "gray",
      "seafoam",
      "indigo",
      "magenta",
      "fuchsia"
    ];
    exports.largeAdditionalInfoKeysObserved = ["lnk3", "lnkE", "pths", "extd", "extn", "FELS", "artd"];
    exports.largeAdditionalInfoKeys = [
      // from documentation
      "LMsk",
      "Lr16",
      "Lr32",
      "Layr",
      "Mt16",
      "Mt32",
      "Mtrn",
      "Alph",
      "FMsk",
      "lnk2",
      "FEid",
      "FXid",
      "PxSD",
      // from guessing
      "cinf",
      ...exports.largeAdditionalInfoKeysObserved
    ];
    function createEnum(prefix, def, map) {
      const rev = /* @__PURE__ */ new Map();
      for (const key of Object.keys(map))
        rev.set(map[key], key);
      const decode = (val) => {
        const value = val.split(".")[1];
        const mapped = value ? rev.get(value) : void 0;
        if (value && !mapped) {
          if (Object.prototype.hasOwnProperty.call(map, value))
            return value;
          const spaced = value.replace(/([A-Z])/g, " $1").toLowerCase();
          if (Object.prototype.hasOwnProperty.call(map, spaced))
            return spaced;
          throw new Error(`Unrecognized value for enum: '${val}'`);
        }
        return mapped || def;
      };
      const encode = (val) => {
        if (val && !map[val])
          throw new Error(`Invalid value for enum: '${val}'`);
        return `${prefix}.${val ? map[val] : map[def]}`;
      };
      return { decode, encode };
    }
    var ColorSpace;
    (function(ColorSpace2) {
      ColorSpace2[ColorSpace2["RGB"] = 0] = "RGB";
      ColorSpace2[ColorSpace2["HSB"] = 1] = "HSB";
      ColorSpace2[ColorSpace2["CMYK"] = 2] = "CMYK";
      ColorSpace2[ColorSpace2["Lab"] = 7] = "Lab";
      ColorSpace2[ColorSpace2["Grayscale"] = 8] = "Grayscale";
    })(ColorSpace || (exports.ColorSpace = ColorSpace = {}));
    var LayerMaskFlags;
    (function(LayerMaskFlags2) {
      LayerMaskFlags2[LayerMaskFlags2["PositionRelativeToLayer"] = 1] = "PositionRelativeToLayer";
      LayerMaskFlags2[LayerMaskFlags2["LayerMaskDisabled"] = 2] = "LayerMaskDisabled";
      LayerMaskFlags2[LayerMaskFlags2["InvertLayerMaskWhenBlending"] = 4] = "InvertLayerMaskWhenBlending";
      LayerMaskFlags2[LayerMaskFlags2["LayerMaskFromRenderingOtherData"] = 8] = "LayerMaskFromRenderingOtherData";
      LayerMaskFlags2[LayerMaskFlags2["MaskHasParametersAppliedToIt"] = 16] = "MaskHasParametersAppliedToIt";
    })(LayerMaskFlags || (exports.LayerMaskFlags = LayerMaskFlags = {}));
    var MaskParams;
    (function(MaskParams2) {
      MaskParams2[MaskParams2["UserMaskDensity"] = 1] = "UserMaskDensity";
      MaskParams2[MaskParams2["UserMaskFeather"] = 2] = "UserMaskFeather";
      MaskParams2[MaskParams2["VectorMaskDensity"] = 4] = "VectorMaskDensity";
      MaskParams2[MaskParams2["VectorMaskFeather"] = 8] = "VectorMaskFeather";
    })(MaskParams || (exports.MaskParams = MaskParams = {}));
    function offsetForChannel(channelId, cmyk) {
      switch (channelId) {
        case 0:
          return 0;
        case 1:
          return 1;
        case 2:
          return 2;
        case 3:
          return cmyk ? 3 : channelId + 1;
        case -1:
          return cmyk ? 4 : 3;
        default:
          return channelId + 1;
      }
    }
    function normalizeLabAB(value, scale = 1) {
      return value < 0 ? value / (128 * scale) : value / (127 * scale);
    }
    function denormalizeLabAB(value, scale = 1) {
      return value < 0 ? value * (128 * scale) : value * (127 * scale);
    }
    function clamp(value, min, max) {
      return value < min ? min : value > max ? max : value;
    }
    function hasAlpha(data) {
      const size = data.width * data.height * 4;
      const max = data.data instanceof Float32Array ? 1 : data.data instanceof Uint16Array ? 65535 : 255;
      for (let i = 3; i < size; i += 4) {
        if (data.data[i] !== max) {
          return true;
        }
      }
      return false;
    }
    function cmykToRgbValues(c, m, y, k, out) {
      out[0] = 255 + c * (-4.387332384609988 * c + 54.48615194189176 * m + 18.82290502165302 * y + 212.25662451639585 * k - 285.2331026137004) + m * (1.7149763477362134 * m - 5.6096736904047315 * y - 17.873870861415444 * k - 5.497006427196366) + y * (-2.5217340131683033 * y - 21.248923337353073 * k + 17.5119270841813) + k * (-21.86122147463605 * k - 189.48180835922747);
      out[1] = 255 + c * (8.841041422036149 * c + 60.118027045597366 * m + 6.871425592049007 * y + 31.159100130055922 * k - 79.2970844816548) + m * (-15.310361306967817 * m + 17.575251261109482 * y + 131.35250912493976 * k - 190.9453302588951) + y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) + k * (-20.737325471181034 * k - 187.80453709719578);
      out[2] = 255 + c * (0.8842522430003296 * c + 8.078677503112928 * m + 30.89978309703729 * y - 0.23883238689178934 * k - 14.183576799673286) + m * (10.49593273432072 * m + 63.02378494754052 * y + 50.606957656360734 * k - 112.23884253719248) + y * (0.03296041114873217 * y + 115.60384449646641 * k - 193.58209356861505) + k * (-22.33816807309886 * k - 180.12613974708367);
    }
    var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
    function solveCmy(r, g, b, k, x) {
      const f = [0, 0, 0], f2 = [0, 0, 0], e = [0, 0, 0];
      const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const h = 1e-4;
      for (let iteration = 0; iteration < 20; iteration++) {
        cmykToRgbValues(x[0], x[1], x[2], k, f);
        e[0] = f[0] - r;
        e[1] = f[1] - g;
        e[2] = f[2] - b;
        if (e[0] * e[0] + e[1] * e[1] + e[2] * e[2] < 1e-6)
          break;
        for (let j = 0; j < 3; j++) {
          const s = x[j];
          x[j] = s + h;
          cmykToRgbValues(x[0], x[1], x[2], k, f2);
          x[j] = s;
          for (let i = 0; i < 3; i++)
            J[i][j] = (f2[i] - f[i]) / h;
        }
        const [[a, b_, c], [d, e_, f_], [g_, h_, i_]] = J;
        const det = a * (e_ * i_ - f_ * h_) - b_ * (d * i_ - f_ * g_) + c * (d * h_ - e_ * g_);
        if (Math.abs(det) < 1e-12)
          break;
        const inverse = [
          [e_ * i_ - f_ * h_, c * h_ - b_ * i_, b_ * f_ - c * e_],
          [f_ * g_ - d * i_, a * i_ - c * g_, c * d - a * f_],
          [d * h_ - e_ * g_, b_ * g_ - a * h_, a * e_ - b_ * d]
        ];
        let changed = 0;
        for (let j = 0; j < 3; j++) {
          const delta = -(inverse[j][0] * e[0] + inverse[j][1] * e[1] + inverse[j][2] * e[2]) / det;
          const value = clamp01(x[j] + delta);
          changed += Math.abs(value - x[j]);
          x[j] = value;
        }
        if (changed < 1e-9)
          break;
      }
      cmykToRgbValues(x[0], x[1], x[2], k, f);
      return (f[0] - r) * (f[0] - r) + (f[1] - g) * (f[1] - g) + (f[2] - b) * (f[2] - b);
    }
    function rgbToCmykExact(r, g, b, out) {
      const max = Math.max(r, g, b) / 255;
      const blackGeneration = Math.pow(clamp01((1 - max - 0.2) / 0.8), 1.3);
      const x = [0, 0, 0];
      let bestScore = Infinity, bestError = Infinity;
      const tryBlack = (k) => {
        x[0] = clamp01(1 - r / 255 - k);
        x[1] = clamp01(1 - g / 255 - k);
        x[2] = clamp01(1 - b / 255 - k);
        const error = solveCmy(r, g, b, k, x);
        const score = Math.max(error, 0.1) + Math.abs(k - blackGeneration) * 0.01;
        if (score < bestScore) {
          bestScore = score;
          bestError = error;
          out[0] = x[0];
          out[1] = x[1];
          out[2] = x[2];
          out[3] = k;
        }
      };
      tryBlack(blackGeneration);
      if (bestError > 0.1) {
        for (let i = 0; i <= 10; i++)
          tryBlack(i / 10);
      }
      if (bestError > 0.1) {
        const k = out[3];
        for (let i = -5; i <= 5; i++)
          tryBlack(clamp01(k + i / 100));
      }
    }
    var cmykLutSize = 33;
    var cmykLut;
    function getCmykLut() {
      if (!cmykLut) {
        const n = cmykLutSize;
        const lut = new Float32Array(n * n * n * 4);
        const out = [0, 0, 0, 0];
        for (let r = 0, o = 0; r < n; r++) {
          for (let g = 0; g < n; g++) {
            for (let b = 0; b < n; b++, o += 4) {
              rgbToCmykExact(r * 255 / (n - 1), g * 255 / (n - 1), b * 255 / (n - 1), out);
              lut[o] = out[0];
              lut[o + 1] = out[1];
              lut[o + 2] = out[2];
              lut[o + 3] = out[3];
            }
          }
        }
        cmykLut = lut;
      }
      return cmykLut;
    }
    function rgbToCmykValues(r, g, b, out) {
      const lut = getCmykLut();
      const n1 = cmykLutSize - 1;
      const fr = clamp01(r) * n1, fg = clamp01(g) * n1, fb = clamp01(b) * n1;
      const r0 = Math.min(n1 - 1, Math.floor(fr)), g0 = Math.min(n1 - 1, Math.floor(fg)), b0 = Math.min(n1 - 1, Math.floor(fb));
      const dr = fr - r0, dg = fg - g0, db = fb - b0;
      out[0] = out[1] = out[2] = out[3] = 0;
      for (let i = 0; i < 8; i++) {
        const ir = i >> 2, ig = i >> 1 & 1, ib = i & 1;
        const w = (ir ? dr : 1 - dr) * (ig ? dg : 1 - dg) * (ib ? db : 1 - db);
        const o = (((r0 + ir) * cmykLutSize + g0 + ig) * cmykLutSize + b0 + ib) * 4;
        out[0] += w * lut[o];
        out[1] += w * lut[o + 1];
        out[2] += w * lut[o + 2];
        out[3] += w * lut[o + 3];
      }
    }
    function resetImageData({ data }) {
      const alpha = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
      for (let p = 0, size = data.length | 0; p < size; p = p + 4 | 0) {
        data[p + 0] = 0;
        data[p + 1] = 0;
        data[p + 2] = 0;
        data[p + 3] = alpha;
      }
    }
    function imageDataToCanvas(pixelData) {
      const canvas = (0, exports.createCanvas)(pixelData.width, pixelData.height);
      let imageData;
      if (pixelData.data instanceof Uint8ClampedArray) {
        imageData = pixelData;
      } else {
        imageData = (0, exports.createImageData)(pixelData.width, pixelData.height);
        const src = pixelData.data;
        const dst = imageData.data;
        if (src instanceof Float32Array) {
          for (let i = 0, size = src.length; i < size; i += 4) {
            dst[i + 0] = Math.round(Math.pow(src[i + 0], 1 / 2.2) * 255);
            dst[i + 1] = Math.round(Math.pow(src[i + 1], 1 / 2.2) * 255);
            dst[i + 2] = Math.round(Math.pow(src[i + 2], 1 / 2.2) * 255);
            dst[i + 3] = Math.round(src[i + 3] * 255);
          }
        } else {
          const shift = src instanceof Uint16Array ? 8 : 0;
          for (let i = 0, size = src.length; i < size; i++) {
            dst[i] = src[i] >>> shift;
          }
        }
      }
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      return canvas;
    }
    function decodeBitmap(input, output, width, height) {
      if (!(input instanceof Uint8Array || input instanceof Uint8ClampedArray))
        throw new Error("Invalid bit depth");
      for (let y = 0, p = 0, o = 0; y < height; y++) {
        for (let x = 0; x < width; ) {
          let b = input[o++];
          for (let i = 0; i < 8 && x < width; i++, x++, p += 4) {
            const v = b & 128 ? 0 : 255;
            b = b << 1;
            output[p + 0] = v;
            output[p + 1] = v;
            output[p + 2] = v;
            output[p + 3] = 255;
          }
        }
      }
    }
    function writeDataRaw(data, offset, width, height) {
      if (!width || !height)
        return void 0;
      const array = new Uint8Array(width * height);
      for (let i = 0; i < array.length; i++) {
        array[i] = data.data[i * 4 + offset];
      }
      return array;
    }
    function writeDataRLE(buffer, { data, width, height }, offsets, large) {
      if (!width || !height)
        return buffer.subarray(0, 0);
      const stride = 4 * width | 0;
      let ol = 0;
      let o = offsets.length * (large ? 4 : 2) * height | 0;
      for (const offset of offsets) {
        for (let y = 0, p = offset | 0; y < height; y++) {
          const strideStart = y * stride | 0;
          const strideEnd = strideStart + stride | 0;
          const lastIndex = strideEnd + offset - 4 | 0;
          const lastIndex2 = lastIndex - 4 | 0;
          const startOffset = o;
          for (p = strideStart + offset | 0; p < strideEnd; p = p + 4 | 0) {
            if (p < lastIndex2) {
              let value1 = data[p];
              p = p + 4 | 0;
              let value2 = data[p];
              p = p + 4 | 0;
              let value3 = data[p];
              if (value1 === value2 && value1 === value3) {
                let count = 3;
                while (count < 128 && p < lastIndex && data[p + 4 | 0] === value1) {
                  count = count + 1 | 0;
                  p = p + 4 | 0;
                }
                buffer[o++] = 1 - count;
                buffer[o++] = value1;
              } else {
                const countIndex = o;
                let writeLast = true;
                let count = 1;
                buffer[o++] = 0;
                buffer[o++] = value1;
                while (p < lastIndex && count < 128) {
                  p = p + 4 | 0;
                  value1 = value2;
                  value2 = value3;
                  value3 = data[p];
                  if (value1 === value2 && value1 === value3) {
                    p = p - 12 | 0;
                    writeLast = false;
                    break;
                  } else {
                    count++;
                    buffer[o++] = value1;
                  }
                }
                if (writeLast) {
                  if (count < 127) {
                    buffer[o++] = value2;
                    buffer[o++] = value3;
                    count += 2;
                  } else if (count < 128) {
                    buffer[o++] = value2;
                    count++;
                    p = p - 4 | 0;
                  } else {
                    p = p - 8 | 0;
                  }
                }
                buffer[countIndex] = count - 1;
              }
            } else if (p === lastIndex) {
              buffer[o++] = 0;
              buffer[o++] = data[p];
            } else {
              buffer[o++] = 1;
              buffer[o++] = data[p];
              p = p + 4 | 0;
              buffer[o++] = data[p];
            }
          }
          if (o > buffer.length)
            throw new Error(`RLE buffer too small (${buffer.length})`);
          const length = o - startOffset;
          if (large) {
            buffer[ol++] = length >> 24 & 255;
            buffer[ol++] = length >> 16 & 255;
          }
          buffer[ol++] = length >> 8 & 255;
          buffer[ol++] = length & 255;
        }
      }
      return buffer.subarray(0, o);
    }
    function planarToBytes(values) {
      if (values instanceof Uint8Array)
        return values;
      const bytes = new Uint8Array(values.byteLength);
      const view = new DataView(bytes.buffer);
      if (values instanceof Uint16Array) {
        for (let i = 0; i < values.length; i++)
          view.setUint16(i * 2, values[i], false);
      } else {
        for (let i = 0; i < values.length; i++)
          view.setFloat32(i * 4, values[i], false);
      }
      return bytes;
    }
    function writeDataRLEBytes(bytes, rowBytes, height, large) {
      const countSize = large ? 4 : 2;
      const buffer = new Uint8Array(height * (countSize + rowBytes + Math.ceil(rowBytes / 128)));
      let o = countSize * height;
      for (let y = 0; y < height; y++) {
        const start = o;
        const rowStart = y * rowBytes;
        const rowEnd = rowStart + rowBytes;
        let i = rowStart;
        while (i < rowEnd) {
          let run = 1;
          while (i + run < rowEnd && run < 128 && bytes[i + run] === bytes[i])
            run++;
          if (run > 1) {
            buffer[o++] = 257 - run;
            buffer[o++] = bytes[i];
            i += run;
          } else {
            const countIndex = o++;
            let count = 0;
            while (i < rowEnd && count < 128) {
              if (i + 2 < rowEnd && bytes[i] === bytes[i + 1] && bytes[i] === bytes[i + 2])
                break;
              buffer[o++] = bytes[i++];
              count++;
            }
            buffer[countIndex] = count - 1;
          }
        }
        const length = o - start;
        for (let j = 0; j < countSize; j++) {
          buffer[y * countSize + j] = length >>> (countSize - j - 1) * 8 & 255;
        }
      }
      return buffer.subarray(0, o);
    }
    function writeDataZipWithPrediction(values, width, height) {
      let bytes;
      if (values instanceof Uint8Array) {
        bytes = new Uint8Array(width * height);
        for (let y = 0, i = 0; y < height; y++) {
          for (let x = 0, prev = 0; x < width; x++, i++) {
            bytes[i] = values[i] - prev;
            prev = values[i];
          }
        }
      } else if (values instanceof Uint16Array) {
        bytes = new Uint8Array(width * height * 2);
        for (let y = 0, i = 0; y < height; y++) {
          for (let x = 0, prev = 0; x < width; x++, i++) {
            const delta = values[i] - prev & 65535;
            bytes[i * 2] = delta >> 8;
            bytes[i * 2 + 1] = delta & 255;
            prev = values[i];
          }
        }
      } else {
        const rowBytes = width * 4;
        const source = planarToBytes(values);
        bytes = new Uint8Array(rowBytes * height);
        for (let y = 0; y < height; y++) {
          const row = y * rowBytes;
          for (let x = 0; x < width; x++) {
            for (let b = 0; b < 4; b++) {
              bytes[row + b * width + x] = source[row + x * 4 + b];
            }
          }
          for (let x = rowBytes - 1; x > 0; x--) {
            bytes[row + x] -= bytes[row + x - 1];
          }
        }
      }
      return (0, pako_1.deflate)(bytes);
    }
    function writeDataZipWithoutPrediction({ data, width, height }, offsets) {
      const size = width * height;
      const channel = new Uint8Array(size);
      const buffers = [];
      let totalLength = 0;
      for (const offset of offsets) {
        for (let i = 0, o = offset; i < size; i++, o += 4) {
          channel[i] = data[o];
        }
        const buffer = (0, pako_1.deflate)(channel);
        buffers.push(buffer);
        totalLength += buffer.byteLength;
      }
      if (buffers.length > 0) {
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const b of buffers) {
          buffer.set(b, offset);
          offset += b.byteLength;
        }
        return buffer;
      } else {
        return buffers[0];
      }
    }
    function createCanvasFromData(data, reader) {
      const canvas = (0, exports.createCanvas)(100, 100);
      try {
        const context = canvas.getContext("2d");
        const imageData = (0, jpeg_1.decodeJpeg)(data, (w, h) => context.createImageData(w, h), reader.totalMemoryLimit);
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        context.putImageData(imageData, 0, 0);
        if (reader.totalMemoryLimit !== void 0)
          reader.totalMemoryLimit -= imageData.width * imageData.height * 4;
      } catch (e) {
        reader.log("JPEG decompression error", e.message);
      }
      return canvas;
    }
    var createCanvas = () => {
      throw new Error("Canvas not initialized, use initializeCanvas method to set up createCanvas method");
    };
    exports.createCanvas = createCanvas;
    var tempCanvas = void 0;
    var createImageData = (width, height) => {
      if (!tempCanvas)
        tempCanvas = (0, exports.createCanvas)(1, 1);
      return tempCanvas.getContext("2d").createImageData(width, height);
    };
    exports.createImageData = createImageData;
    if (typeof document !== "undefined") {
      exports.createCanvas = (width, height) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
      };
    }
    function initializeCanvas(createCanvasMethod, createImageDataMethod) {
      exports.createCanvas = createCanvasMethod;
      exports.createImageData = createImageDataMethod || exports.createImageData;
    }
  }
});

// github-r14-stage/export-deps/node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "github-r14-stage/export-deps/node_modules/base64-js/index.js"(exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    var i;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/utf8.js
var require_utf8 = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/utf8.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stringLengthInBytes = stringLengthInBytes;
    exports.encodeStringTo = encodeStringTo;
    exports.encodeString = encodeString;
    exports.decodeString = decodeString;
    function charLengthInBytes(code) {
      if ((code & 4294967168) === 0) {
        return 1;
      } else if ((code & 4294965248) === 0) {
        return 2;
      } else if ((code & 4294901760) === 0) {
        return 3;
      } else {
        return 4;
      }
    }
    function codePointAt(value, i) {
      const code = value.charCodeAt(i);
      if (code < 55296 || code > 57343)
        return code;
      if (code <= 56319 && i + 1 < value.length) {
        const extra = value.charCodeAt(i + 1);
        if (extra >= 56320 && extra <= 57343) {
          return ((code & 1023) << 10) + (extra & 1023) + 65536;
        }
      }
      return 65533;
    }
    function stringLengthInBytes(value) {
      let result = 0;
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code < 128) {
          result += 1;
        } else if (code < 2048) {
          result += 2;
        } else {
          const scalar = codePointAt(value, i);
          if (scalar > 65535) {
            result += 4;
            i++;
          } else {
            result += 3;
          }
        }
      }
      return result;
    }
    function writeCharacter(buffer, offset, code) {
      const length = charLengthInBytes(code);
      switch (length) {
        case 1:
          buffer[offset] = code;
          break;
        case 2:
          buffer[offset] = code >> 6 & 31 | 192;
          buffer[offset + 1] = code & 63 | 128;
          break;
        case 3:
          buffer[offset] = code >> 12 & 15 | 224;
          buffer[offset + 1] = code >> 6 & 63 | 128;
          buffer[offset + 2] = code & 63 | 128;
          break;
        default:
          buffer[offset] = code >> 18 & 7 | 240;
          buffer[offset + 1] = code >> 12 & 63 | 128;
          buffer[offset + 2] = code >> 6 & 63 | 128;
          buffer[offset + 3] = code & 63 | 128;
          break;
      }
      return length;
    }
    function encodeStringTo(buffer, offset, value) {
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code < 128) {
          buffer[offset++] = code;
        } else {
          const scalar = codePointAt(value, i);
          if (scalar > 65535)
            i++;
          offset += writeCharacter(buffer, offset, scalar);
        }
      }
      return offset;
    }
    function encodeString(value) {
      if (value.length > 1e3 && typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value);
      }
      const buffer = new Uint8Array(stringLengthInBytes(value));
      encodeStringTo(buffer, 0, value);
      return buffer;
    }
    function decodeString(value) {
      const result = [];
      function pushCodePoint(code) {
        if (code > 65535) {
          code -= 65536;
          result.push(String.fromCharCode(code >>> 10 & 1023 | 55296));
          code = 56320 | code & 1023;
        }
        result.push(String.fromCharCode(code));
      }
      let codePoint = 0;
      let bytesSeen = 0;
      let bytesNeeded = 0;
      let lowerBoundary = 128;
      let upperBoundary = 191;
      for (let i = 0; i < value.length; i++) {
        const byte = value[i];
        if (bytesNeeded === 0) {
          if (byte <= 127) {
            pushCodePoint(byte);
          } else if (byte >= 194 && byte <= 223) {
            bytesNeeded = 1;
            codePoint = byte & 31;
          } else if (byte >= 224 && byte <= 239) {
            if (byte === 224)
              lowerBoundary = 160;
            if (byte === 237)
              upperBoundary = 159;
            bytesNeeded = 2;
            codePoint = byte & 15;
          } else if (byte >= 240 && byte <= 244) {
            if (byte === 240)
              lowerBoundary = 144;
            if (byte === 244)
              upperBoundary = 143;
            bytesNeeded = 3;
            codePoint = byte & 7;
          } else {
            pushCodePoint(65533);
          }
          continue;
        }
        if (byte < lowerBoundary || byte > upperBoundary) {
          codePoint = 0;
          bytesNeeded = 0;
          bytesSeen = 0;
          lowerBoundary = 128;
          upperBoundary = 191;
          pushCodePoint(65533);
          i--;
          continue;
        }
        lowerBoundary = 128;
        upperBoundary = 191;
        codePoint = codePoint << 6 | byte & 63;
        bytesSeen++;
        if (bytesSeen !== bytesNeeded)
          continue;
        pushCodePoint(codePoint);
        codePoint = 0;
        bytesNeeded = 0;
        bytesSeen = 0;
      }
      if (bytesNeeded !== 0) {
        pushCodePoint(65533);
      }
      return result.join("");
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/engineData.js
var require_engineData = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/engineData.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setProperty = setProperty;
    exports.parseEngineData = parseEngineData;
    exports.serializeEngineData = serializeEngineData;
    var psdReader_1 = require_psdReader();
    function isWhitespace(char) {
      return char === 32 || char === 10 || char === 13 || char === 9;
    }
    function isNumber(char) {
      return char >= 48 && char <= 57 || char === 46 || char === 45;
    }
    function setProperty(target, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        target[key] = value;
      }
    }
    var NODE_COST = 64;
    function parseEngineData(data, reader) {
      let index = 0;
      function skipWhitespace() {
        while (index < data.length && isWhitespace(data[index])) {
          index++;
        }
      }
      function getTextByte() {
        let byte = data[index];
        index++;
        if (byte === 92) {
          byte = data[index];
          index++;
        }
        return byte;
      }
      function getText() {
        let result = "";
        if (data[index] === 41) {
          index++;
          return result;
        }
        if (data[index] !== 254 || data[index + 1] !== 255) {
          while (index < data.length && data[index] !== 41) {
            result += String.fromCharCode(getTextByte());
          }
          (0, psdReader_1.consumeMemory)(reader, result.length * 2);
          index++;
          return result;
        }
        index += 2;
        while (index < data.length && data[index] !== 41) {
          const high = getTextByte();
          const low = getTextByte();
          const char = high << 8 | low;
          result += String.fromCharCode(char);
        }
        (0, psdReader_1.consumeMemory)(reader, result.length * 2);
        index++;
        return result;
      }
      let root = null;
      const stack = [];
      function pushContainer(value) {
        if (!stack.length) {
          stack.push(value);
          root = value;
        } else {
          pushValue(value);
          stack.push(value);
        }
      }
      function pushValue(value) {
        if (!stack.length)
          throw new Error("Invalid data");
        (0, psdReader_1.consumeMemory)(reader, NODE_COST);
        const top = stack[stack.length - 1];
        if (typeof top === "string") {
          const target = stack[stack.length - 2];
          setProperty(target, top, value);
          pop();
        } else if (Array.isArray(top)) {
          top.push(value);
        } else {
          throw new Error("Invalid data");
        }
      }
      function pushProperty(name) {
        if (!stack.length)
          pushContainer({});
        const top = stack[stack.length - 1];
        if (typeof top === "string" || Array.isArray(top)) {
          if (name === "nil") {
            pushValue(null);
          } else {
            pushValue(`/${name}`);
          }
        } else if (top && typeof top === "object") {
          (0, psdReader_1.consumeMemory)(reader, NODE_COST + name.length * 2);
          stack.push(name);
        } else {
          throw new Error("Invalid data");
        }
      }
      function pop() {
        if (!stack.length)
          throw new Error("Invalid data");
        stack.pop();
      }
      skipWhitespace();
      let dataLength = data.length;
      let invalidTokens = 0;
      let firstInvalidToken = "";
      while (dataLength > 0 && data[dataLength - 1] === 0)
        dataLength--;
      while (index < dataLength) {
        const i = index;
        const char = data[i];
        if (char === 60 && data[i + 1] === 60) {
          index += 2;
          pushContainer({});
        } else if (char === 62 && data[i + 1] === 62) {
          index += 2;
          pop();
        } else if (char === 47) {
          index += 1;
          const start = index;
          while (index < data.length && !isWhitespace(data[index])) {
            index++;
          }
          let name = "";
          for (let i2 = start; i2 < index; i2++) {
            name += String.fromCharCode(data[i2]);
          }
          pushProperty(name);
        } else if (char === 40) {
          index += 1;
          pushValue(getText());
        } else if (char === 91) {
          index += 1;
          pushContainer([]);
        } else if (char === 93) {
          index += 1;
          pop();
        } else if (char === 110 && data[i + 1] === 117 && data[i + 2] === 108 && data[i + 3] === 108) {
          index += 4;
          pushValue(null);
        } else if (char === 116 && data[i + 1] === 114 && data[i + 2] === 117 && data[i + 3] === 101) {
          index += 4;
          pushValue(true);
        } else if (char === 102 && data[i + 1] === 97 && data[i + 2] === 108 && data[i + 3] === 115 && data[i + 4] === 101) {
          index += 5;
          pushValue(false);
        } else if (isNumber(char)) {
          let value = "";
          while (index < data.length && isNumber(data[index])) {
            value += String.fromCharCode(data[index]);
            index++;
          }
          pushValue(parseFloat(value));
        } else {
          index += 1;
          if (!invalidTokens)
            firstInvalidToken = `'${String.fromCharCode(char)}' (${char}) at ${index}`;
          invalidTokens++;
        }
        skipWhitespace();
      }
      if (invalidTokens) {
        reader.log(`Invalid tokens in engine data (${invalidTokens} in total, first: ${firstInvalidToken})`);
      }
      return root;
    }
    var floatKeys = [
      "Axis",
      "XY",
      "Zone",
      "WordSpacing",
      "FirstLineIndent",
      "GlyphSpacing",
      "StartIndent",
      "EndIndent",
      "SpaceBefore",
      "SpaceAfter",
      "LetterSpacing",
      "Values",
      "GridSize",
      "GridLeading",
      "PointBase",
      "BoxBounds",
      "TransformPoint0",
      "TransformPoint1",
      "TransformPoint2",
      "FontSize",
      "Leading",
      "HorizontalScale",
      "VerticalScale",
      "BaselineShift",
      "Tsume",
      "OutlineWidth",
      "AutoLeading"
    ];
    var intArrays = ["RunLengthArray"];
    function serializeEngineData(data, condensed = false) {
      let buffer = new Uint8Array(1024);
      let offset = 0;
      let indent = 0;
      function write(value) {
        if (offset >= buffer.length) {
          const newBuffer = new Uint8Array(buffer.length * 2);
          newBuffer.set(buffer);
          buffer = newBuffer;
        }
        buffer[offset] = value;
        offset++;
      }
      function writeString(value) {
        for (let i = 0; i < value.length; i++) {
          write(value.charCodeAt(i));
        }
      }
      function writeIndent() {
        if (condensed) {
          writeString(" ");
        } else {
          for (let i = 0; i < indent; i++) {
            writeString("	");
          }
        }
      }
      function writeProperty(key, value) {
        writeIndent();
        writeString(`/${key}`);
        writeValue(value, key, true);
        if (!condensed)
          writeString("\n");
      }
      function finite(value) {
        return Number.isFinite(value) ? value : 0;
      }
      function serializeInt(value) {
        return finite(value).toString();
      }
      function serializeFloat(value) {
        return finite(value).toFixed(5).replace(/(\d)0+$/g, "$1").replace(/^0+\.([1-9])/g, ".$1").replace(/^-0+\.0(\d)/g, "-.0$1");
      }
      function serializeNumber(value, key) {
        value = finite(value);
        const isFloat = key && floatKeys.indexOf(key) !== -1 || (value | 0) !== value;
        return isFloat ? serializeFloat(value) : serializeInt(value);
      }
      function getKeys(value) {
        const keys = Object.keys(value);
        if (keys.indexOf("98") !== -1)
          keys.unshift(...keys.splice(keys.indexOf("98"), 1));
        if (keys.indexOf("99") !== -1)
          keys.unshift(...keys.splice(keys.indexOf("99"), 1));
        return keys;
      }
      function writeStringByte(value) {
        if (value === 40 || value === 41 || value === 92) {
          write(92);
        }
        write(value);
      }
      function writeValue(value, key, inProperty = false) {
        function writePrefix() {
          if (inProperty) {
            writeString(" ");
          } else {
            writeIndent();
          }
        }
        if (value === null || value === void 0) {
          writePrefix();
          writeString(condensed ? "/nil" : "null");
        } else if (typeof value === "number") {
          writePrefix();
          writeString(serializeNumber(value, key));
        } else if (typeof value === "boolean") {
          writePrefix();
          writeString(value ? "true" : "false");
        } else if (typeof value === "string") {
          writePrefix();
          if ((key === "99" || key === "98") && value.charAt(0) === "/") {
            writeString(value);
          } else {
            writeString("(");
            write(254);
            write(255);
            for (let i = 0; i < value.length; i++) {
              const code = value.charCodeAt(i);
              writeStringByte(code >> 8 & 255);
              writeStringByte(code & 255);
            }
            writeString(")");
          }
        } else if (Array.isArray(value)) {
          writePrefix();
          if (value.every((x) => typeof x === "number")) {
            writeString("[");
            const intArray = intArrays.indexOf(key) !== -1;
            for (const x of value) {
              writeString(" ");
              writeString(intArray ? serializeNumber(x) : serializeFloat(x));
            }
            writeString(" ]");
          } else {
            writeString("[");
            if (!condensed)
              writeString("\n");
            for (const x of value) {
              writeValue(x, key);
              if (!condensed)
                writeString("\n");
            }
            writeIndent();
            writeString("]");
          }
        } else if (typeof value === "object") {
          if (inProperty && !condensed)
            writeString("\n");
          writeIndent();
          writeString("<<");
          if (!condensed)
            writeString("\n");
          indent++;
          for (const key2 of getKeys(value)) {
            if (value[key2] !== void 0)
              writeProperty(key2, value[key2]);
          }
          indent--;
          writeIndent();
          writeString(">>");
        }
        return void 0;
      }
      if (condensed) {
        if (typeof data === "object") {
          for (const key of getKeys(data)) {
            if (data[key] !== void 0)
              writeProperty(key, data[key]);
          }
        }
      } else {
        writeString("\n\n");
        writeValue(data);
      }
      return buffer.slice(0, offset);
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/descriptor.js
var require_descriptor = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/descriptor.js"(exports) {
    "use strict";
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FlCl = exports.ExtR = exports.ExtT = exports.DfsM = exports.blurType = exports.Lns = exports.MztT = exports.Chnl = exports.Dstr = exports.ZZTy = exports.Wvtp = exports.SphM = exports.RplS = exports.Cnvr = exports.UndA = exports.DspM = exports.SmBQ = exports.SmBM = exports.BlrQ = exports.BlrM = exports.strokeStyleLineAlignment = exports.strokeStyleLineJoinType = exports.strokeStyleLineCapType = exports.ESliceBGColorType = exports.ESliceOrigin = exports.ESliceVertAlign = exports.ESliceHorzAlign = exports.ESliceType = exports.FrFl = exports.FStl = exports.ClrS = exports.Clry = exports.gradientInterpolationMethodType = exports.stdTrackID = exports.animInterpStyleEnum = exports.GrdT = exports.IGSr = exports.BETE = exports.BESs = exports.bvlT = exports.BESl = exports.BlnM = exports.warpStyle = exports.Annt = exports.Ornt = exports.textGridding = exports.outputSettingsRoot = exports.layerStateRoot = exports.cameraRawFilterKeyTypes = exports.cameraRawFilterClassID = void 0;
    exports.patternColorHandling = exports.presetKindType = exports.prjM = exports.FlMd = exports.IntC = exports.IntE = exports.Drct = exports.WndM = exports.CntE = void 0;
    exports.readAsciiStringOrClassId = readAsciiStringOrClassId;
    exports.writeAsciiStringOrClassId = writeAsciiStringOrClassId;
    exports.readDescriptorStructure = readDescriptorStructure;
    exports.writeDescriptorStructure = writeDescriptorStructure;
    exports.pathSelectionStateToReference = pathSelectionStateToReference;
    exports.writeClassStructure = writeClassStructure;
    exports.readVersionAndDescriptor = readVersionAndDescriptor;
    exports.writeVersionAndDescriptor = writeVersionAndDescriptor;
    exports.horzVrtcToXY = horzVrtcToXY;
    exports.xyToHorzVrtc = xyToHorzVrtc;
    exports.descBoundsToBounds = descBoundsToBounds;
    exports.boundsToDescBounds = boundsToDescBounds;
    exports.serializeEffects = serializeEffects;
    exports.parseEffects = parseEffects;
    exports.parseTrackList = parseTrackList;
    exports.serializeTrackList = serializeTrackList;
    exports.parseVectorContent = parseVectorContent;
    exports.serializeVectorContent = serializeVectorContent;
    exports.parseColor = parseColor;
    exports.serializeColor = serializeColor;
    exports.parseAngle = parseAngle;
    exports.parsePercent = parsePercent;
    exports.parsePercentOrAngle = parsePercentOrAngle;
    exports.parseUnits = parseUnits;
    exports.parseUnitsOrNumber = parseUnitsOrNumber;
    exports.parseUnitsToNumber = parseUnitsToNumber;
    exports.unitsAngle = unitsAngle;
    exports.unitsPercent = unitsPercent;
    exports.unitsPercentF = unitsPercentF;
    exports.unitsValue = unitsValue;
    exports.frac = frac;
    var helpers_1 = require_helpers();
    var engineData_1 = require_engineData();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var unitsMap = /* @__PURE__ */ new Map([
      ["#Ang", "Angle"],
      ["#Rsl", "Density"],
      ["#Rlt", "Distance"],
      ["#Nne", "None"],
      ["#Prc", "Percent"],
      ["#Pxl", "Pixels"],
      ["#Mlm", "Millimeters"],
      ["#Pnt", "Points"],
      ["RrPi", "Picas"],
      ["RrIn", "Inches"],
      ["RrCm", "Centimeters"]
    ]);
    var unitsMapRev = /* @__PURE__ */ new Map();
    unitsMap.forEach((value, key) => unitsMapRev.set(value, key));
    function makeType(name, classID) {
      return { name, classID };
    }
    var nullType = makeType("", "null");
    var USE_CHINESE = false;
    var fieldToExtType = {
      strokeStyleContent: makeType("", "solidColorLayer"),
      printProofSetup: makeType(USE_CHINESE ? "\u6821\u6837\u8BBE\u7F6E" : "Proof Setup", "proofSetup"),
      Grad: makeType(USE_CHINESE ? "\u6E10\u53D8" : "Gradient", "Grdn"),
      Trnf: makeType(USE_CHINESE ? "\u53D8\u6362" : "Transform", "Trnf"),
      patternFill: makeType("", "patternFill"),
      ebbl: makeType("", "ebbl"),
      SoFi: makeType("", "SoFi"),
      GrFl: makeType("", "GrFl"),
      sdwC: makeType("", "RGBC"),
      hglC: makeType("", "RGBC"),
      "Clr ": makeType("", "RGBC"),
      "tintColor": makeType("", "RGBC"),
      Ofst: makeType("", "Pnt "),
      ChFX: makeType("", "ChFX"),
      MpgS: makeType("", "ShpC"),
      DrSh: makeType("", "DrSh"),
      IrSh: makeType("", "IrSh"),
      OrGl: makeType("", "OrGl"),
      IrGl: makeType("", "IrGl"),
      TrnS: makeType("", "ShpC"),
      Ptrn: makeType("", "Ptrn"),
      FrFX: makeType("", "FrFX"),
      phase: makeType("", "Pnt "),
      frameStep: nullType,
      duration: nullType,
      workInTime: nullType,
      workOutTime: nullType,
      audioClipGroupList: nullType,
      bounds: makeType("", "Rctn"),
      customEnvelopeWarp: makeType("", "customEnvelopeWarp"),
      warp: makeType("", "warp"),
      "Sz  ": makeType("", "Pnt "),
      origin: makeType("", "Pnt "),
      autoExpandOffset: makeType("", "Pnt "),
      keyOriginShapeBBox: makeType("", "unitRect"),
      Vrsn: nullType,
      psVersion: nullType,
      docDefaultNewArtboardBackgroundColor: makeType("", "RGBC"),
      artboardRect: makeType("", "classFloatRect"),
      framedGroupRect: makeType("", "classFloatRect"),
      keyOriginRRectRadii: makeType("", "radii"),
      keyOriginBoxCorners: nullType,
      rectangleCornerA: makeType("", "Pnt "),
      rectangleCornerB: makeType("", "Pnt "),
      rectangleCornerC: makeType("", "Pnt "),
      rectangleCornerD: makeType("", "Pnt "),
      keyOriginPolyPreviousTightBoxCorners: nullType,
      keyOriginPolyTrueRectCorners: nullType,
      keyOriginLineStart: makeType("", "Pnt "),
      keyOriginLineEnd: makeType("", "Pnt "),
      compInfo: nullType,
      quiltWarp: makeType("", "quiltWarp"),
      generatorSettings: nullType,
      crema: nullType,
      FrIn: nullType,
      blendOptions: nullType,
      FXRf: nullType,
      Lefx: nullType,
      time: nullType,
      animKey: nullType,
      timeScope: nullType,
      inTime: nullType,
      outTime: nullType,
      sheetStyle: nullType,
      translation: nullType,
      Skew: nullType,
      boundingBox: makeType("", "boundingBox"),
      "Lnk ": makeType("", "ExternalFileLink"),
      frameReader: makeType("", "FrameReader"),
      effectParams: makeType("", "motionTrackEffectParams"),
      Impr: makeType("None", "none"),
      Anch: makeType("", "Pnt "),
      "Fwd ": makeType("", "Pnt "),
      "Bwd ": makeType("", "Pnt "),
      FlrC: makeType("", "Pnt "),
      meshBoundaryPath: makeType("", "pathClass"),
      filterFX: makeType("", "filterFXStyle"),
      Fltr: makeType("", "rigidTransform"),
      FrgC: makeType("", "RGBC"),
      BckC: makeType("", "RGBC"),
      sdwM: makeType("Parameters", "adaptCorrectTones"),
      hglM: makeType("Parameters", "adaptCorrectTones"),
      customShape: makeType("", "customShape"),
      origFXRefPoint: nullType,
      FXRefPoint: nullType,
      vectorMask: nullType,
      layerSpecific: nullType,
      LSpc: nullType,
      textLayerSettings: makeType("", "warp"),
      placedLayerSettings: nullType,
      IMsk: nullType,
      VMsk: nullType,
      TxtC: nullType,
      ClMg: makeType("", "ClMg"),
      interpretation: makeType("", "footageInterpretation"),
      bgColor: makeType("", "NativeQuad")
    };
    var fieldToArrayExtType = {
      "Crv ": makeType("", "CrPt"),
      Clrs: makeType("", "Clrt"),
      Trns: makeType("", "TrnS"),
      keyDescriptorList: nullType,
      keyRootDescriptorList: nullType,
      solidFillMulti: makeType("", "SoFi"),
      gradientFillMulti: makeType("", "GrFl"),
      dropShadowMulti: makeType("", "DrSh"),
      innerShadowMulti: makeType("", "IrSh"),
      frameFXMulti: makeType("", "FrFX"),
      FrIn: nullType,
      FSts: nullType,
      LaSt: nullType,
      sheetTimelineOptions: nullType,
      trackList: makeType("", "animationTrack"),
      globalTrackList: makeType("", "animationTrack"),
      keyList: nullType,
      audioClipGroupList: nullType,
      audioClipList: nullType,
      countObjectList: makeType("", "countObject"),
      countGroupList: makeType("", "countGroup"),
      slices: makeType("", "slice"),
      "Pts ": makeType("", "Pthp"),
      SbpL: makeType("", "SbpL"),
      pathComponents: makeType("", "PaCm"),
      filterFXList: makeType("", "filterFX"),
      puppetShapeList: makeType("", "puppetShape"),
      channelDenoise: makeType("", "channelDenoiseParams"),
      ShrP: makeType("", "Pnt "),
      layerSettings: nullType,
      list: nullType,
      Adjs: makeType("", "CrvA"),
      vertices: makeType("", "Pnt "),
      warpedVertices: makeType("", "Pnt "),
      quads: makeType("", "quadIndices")
    };
    var typeToField = {
      "TEXT": [
        "Txt ",
        "printerName",
        "Nm  ",
        "Idnt",
        "blackAndWhitePresetFileName",
        "LUT3DFileName",
        "exportOption",
        "scaleSettings",
        "BackgroundImagePath",
        "ImageSubfolderName",
        "SavedIteratedName",
        "presetFileName",
        "curvesPresetFileName",
        "mixerPresetFileName",
        "placed",
        "description",
        "reason",
        "artboardPresetName",
        "json",
        "clipID",
        "relPath",
        "fullPath",
        "mediaDescriptor",
        "Msge",
        "altTag",
        "url",
        "cellText",
        "preset",
        "KnNm",
        "FPth",
        "comment",
        "originalPath",
        "Bk  ",
        "pathUnicodeName"
      ],
      "tdta": [
        "EngineData",
        "LUT3DFileData",
        "indexArray",
        "originalVertexArray",
        "deformedVertexArray",
        "LqMe",
        "bookKey"
      ],
      "long": [
        "TextIndex",
        "RndS",
        "Mdpn",
        "Smth",
        "Lctn",
        "strokeStyleVersion",
        "LaID",
        "Vrsn",
        "Cnt ",
        "bookID",
        "cropRectBottom",
        "cropRectLeft",
        "cropRectRight",
        "cropRectTop",
        // save for web output settings
        "Version",
        "BackgroundColorBlue",
        "BackgroundColorGreen",
        "BackgroundColorRed",
        "BackgroundColorState",
        "AttributeCase",
        "Encoding",
        "DuplicateFileNameBehavior",
        "ImageMapLocation",
        "ImageMapType",
        "Indent",
        "LineEndings",
        "SpacersEmptyCells",
        "SpacersHorizontal",
        "SpacersVertical",
        "StylesFormat",
        "TDWidthHeight",
        "TagCase",
        "ColorPolicy",
        "MetadataPolicy",
        "Brgh",
        "Cntr",
        "means",
        "vibrance",
        "Strt",
        "bwPresetKind",
        "comp",
        "compID",
        "originalCompID",
        "curvesPresetKind",
        "mixerPresetKind",
        "uOrder",
        "vOrder",
        "PgNm",
        "totalPages",
        "Crop",
        "numerator",
        "denominator",
        "frameCount",
        "Annt",
        "keyOriginType",
        "unitValueQuadVersion",
        "keyOriginIndex",
        "major",
        "minor",
        "fix",
        "docDefaultNewArtboardBackgroundType",
        "artboardBackgroundType",
        "numModifyingFX",
        "deformNumRows",
        "deformNumCols",
        "FrID",
        "FrDl",
        "FsID",
        "LCnt",
        "AFrm",
        "AFSt",
        "numBefore",
        "numAfter",
        "Spcn",
        "minOpacity",
        "maxOpacity",
        "BlnM",
        "sheetID",
        "gblA",
        "globalAltitude",
        "descVersion",
        "frameReaderType",
        "LyrI",
        "zoomOrigin",
        "fontSize",
        "Rds ",
        "sliceID",
        "topOutset",
        "leftOutset",
        "bottomOutset",
        "rightOutset",
        "filterID",
        "meshQuality",
        "meshExpansion",
        "meshRigidity",
        "VrsM",
        "VrsN",
        "NmbG",
        "WLMn",
        "WLMx",
        "AmMn",
        "AmMx",
        "SclH",
        "SclV",
        "Lvl ",
        "TlNm",
        "TlOf",
        "FlRs",
        "Thsh",
        "ShrS",
        "ShrE",
        "FlRs",
        "Vrnc",
        "Strg",
        "ExtS",
        "ExtD",
        "HrzS",
        "VrtS",
        "NmbR",
        "EdgF",
        "Ang1",
        "Ang2",
        "Ang3",
        "Ang4",
        "lastAppliedComp",
        "capturedInfo",
        "pixelSourceType",
        "framedGroupType",
        "keyOriginPolySides",
        "keyOriginLineArrConc",
        "noisePreSeed",
        "associatedLayer",
        "placedLayerCompID",
        "VAlign"
      ],
      "enum": [
        "textGridding",
        "Ornt",
        "warpStyle",
        "warpRotate",
        "Inte",
        "Bltn",
        "ClrS",
        "BlrQ",
        "bvlT",
        "bvlS",
        "bvlD",
        "Md  ",
        "glwS",
        "GrdF",
        "GlwT",
        "RplS",
        "BlrM",
        "SmBM",
        "strokeStyleLineCapType",
        "strokeStyleLineJoinType",
        "strokeStyleLineAlignment",
        "strokeStyleBlendMode",
        "PntT",
        "Styl",
        "lookupType",
        "LUTFormat",
        "dataOrder",
        "tableOrder",
        "enableCompCore",
        "enableCompCoreGPU",
        "compCoreSupport",
        "compCoreGPUSupport",
        "Engn",
        "enableCompCoreThreads",
        "gs99",
        "FrDs",
        "trackID",
        "animInterpStyle",
        "horzAlign",
        "vertAlign",
        "bgColorType",
        "shapeOperation",
        "UndA",
        "Wvtp",
        "Drct",
        "WndM",
        "Edg ",
        "FlCl",
        "IntE",
        "IntC",
        "Cnvr",
        "Fl  ",
        "Dstr",
        "MztT",
        "Lns ",
        "ExtT",
        "DspM",
        "ExtR",
        "ZZTy",
        "SphM",
        "SmBQ",
        "placedLayerOCIOConversion",
        "gradientsInterpolationMethod",
        "pathSymmetryMode",
        "interpretAlpha",
        "knockout",
        "TxPT",
        "TxPR"
      ],
      "bool": [
        "PstS",
        "printSixteenBit",
        "masterFXSwitch",
        "enab",
        "uglg",
        "antialiasGloss",
        "useShape",
        "useTexture",
        "uglg",
        "antialiasGloss",
        "useShape",
        "Vsbl",
        "useTexture",
        "Algn",
        "Rvrs",
        "Dthr",
        "Invr",
        "VctC",
        "ShTr",
        "layerConceals",
        "strokeEnabled",
        "fillEnabled",
        "strokeStyleScaleLock",
        "strokeStyleStrokeAdjust",
        "hardProof",
        "MpBl",
        "paperWhite",
        "useLegacy",
        "Auto",
        "Lab ",
        "useTint",
        "keyShapeInvalidated",
        "autoExpandEnabled",
        "autoNestEnabled",
        "autoPositionEnabled",
        "shrinkwrapOnSaveEnabled",
        "present",
        "showInDialog",
        "overprint",
        "sheetDisclosed",
        "lightsDisclosed",
        "meshesDisclosed",
        "materialsDisclosed",
        "hasMotion",
        "muted",
        "Effc",
        "selected",
        "autoScope",
        "fillCanvas",
        "cellTextIsHTML",
        "Smoo",
        "Clsp",
        "validAtPosition",
        "rigidType",
        "hasoptions",
        "filterMaskEnable",
        "filterMaskLinked",
        "filterMaskExtendWithWhite",
        "removeJPEGArtifact",
        "Mnch",
        "ExtF",
        "ExtM",
        "moreAccurate",
        "GpuY",
        "LIWy",
        "Cnty",
        "Lnkd",
        "showAlteredVideo",
        "lightingOn",
        "LockPPI",
        "keyOriginLineArrowSt",
        "keyOriginLineArrowEnd",
        "Expn",
        "substitutesUsed",
        "blendClipped",
        "blendInterior",
        "TxMP"
      ],
      "doub": [
        "warpValue",
        "warpPerspective",
        "warpPerspectiveOther",
        "Intr",
        "Wdth",
        "Hght",
        "Gmm ",
        "strokeStyleMiterLimit",
        "strokeStyleResolution",
        "layerTime",
        "keyOriginResolution",
        "xx",
        "xy",
        "yx",
        "yy",
        "tx",
        "ty",
        "FrGA",
        "frameRate",
        "audioLevel",
        "rotation",
        "X   ",
        "Y   ",
        "redFloat",
        "greenFloat",
        "blueFloat",
        "imageResolution",
        "PuX0",
        "PuX1",
        "PuX2",
        "PuX3",
        "PuY0",
        "PuY1",
        "PuY2",
        "PuY3",
        "stylization",
        "cleanliness",
        "brushScale",
        "microBrush",
        "specularity",
        "PreferredResolution",
        "FrGL",
        "keyOriginLineWeight",
        "keyOriginLineArrWdth",
        "keyOriginLineArrLngth",
        "keyOriginPolyPixelHSF",
        "keyOriginPolyCornerRadius",
        "gradientAspectRatio"
      ],
      "UntF": [
        "sdwO",
        "hglO",
        "lagl",
        "Lald",
        "srgR",
        "blur",
        "Sftn",
        "Opct",
        "Dstn",
        "Angl",
        "Ckmt",
        "Nose",
        "Inpr",
        "ShdN",
        "strokeStyleLineWidth",
        "strokeStyleLineDashOffset",
        "strokeStyleOpacity",
        "H   ",
        "Top ",
        "Left",
        "Btom",
        "Rght",
        "Rslt",
        "topRight",
        "topLeft",
        "bottomLeft",
        "bottomRight",
        "ClNs",
        "Shrp",
        "fillOpacity",
        "keyOriginPolyStarRatio"
      ],
      "VlLs": [
        "Crv ",
        "Clrs",
        "Mnm ",
        "Mxm ",
        "Trns",
        "pathList",
        "keyRootDescriptorList",
        "strokeStyleLineDashSet",
        "FrLs",
        "slices",
        "LaSt",
        "Trnf",
        "nonAffineTransform",
        "keyDescriptorList",
        "guideIndeces",
        "gradientFillMulti",
        "solidFillMulti",
        "frameFXMulti",
        "innerShadowMulti",
        "dropShadowMulti",
        "FrIn",
        "FSts",
        "FsFr",
        "sheetTimelineOptions",
        "audioClipList",
        "trackList",
        "globalTrackList",
        "keyList",
        "audioClipList",
        "warpValues",
        "selectedPin",
        "Pts ",
        "SbpL",
        "pathComponents",
        "pinOffsets",
        "posFinalPins",
        "pinVertexIndices",
        "PinP",
        "PnRt",
        "PnOv",
        "PnDp",
        "filterFXList",
        "puppetShapeList",
        "ShrP",
        "channelDenoise",
        "Mtrx",
        "layerSettings",
        "list",
        "compList",
        "Adjs",
        "vertices",
        "warpedVertices",
        "quads",
        "indices",
        "Mpng",
        "textLayerSettingsWarpRect"
      ],
      "ObAr": ["meshPoints", "quiltSliceX", "quiltSliceY"],
      "obj ": ["null", "Chnl"],
      "Pth ": ["DspF"],
      "alis": ["alis"]
    };
    var channels = [
      "Rd  ",
      "Grn ",
      "Bl  ",
      "Yllw",
      "Ylw ",
      "Cyn ",
      "Mgnt",
      "Blck",
      "Gry ",
      "Lmnc",
      "A   ",
      "B   "
    ];
    var doubleColorClasses = ["Grsc", "LbCl", "GRYC", "LABC"];
    exports.cameraRawFilterClassID = "Adobe Camera Raw Filter";
    exports.cameraRawFilterKeyTypes = {
      CrVe: "TEXT",
      PrVN: "long",
      PrVe: "long",
      WBal: "enum",
      Ex12: "doub",
      ShpR: "doub",
      "Crv ": "VlLs",
      CrvR: "VlLs",
      CrvG: "VlLs",
      CrvB: "VlLs"
    };
    function guessOSType(value) {
      if (typeof value === "boolean")
        return "bool";
      if (typeof value === "number" && !Number.isInteger(value))
        return "doub";
      if (Array.isArray(value))
        return "VlLs";
      if (value && typeof value === "object") {
        if (typeof value._classID === "string")
          return "Objc";
        if (typeof value.classID === "string")
          return "type";
        if (typeof value.low === "number" && typeof value.high === "number")
          return "comp";
        if (typeof value.units === "string" && typeof value.value === "number")
          return "UntF";
      }
      return void 0;
    }
    var fieldToArrayType = {
      "Mnm ": "long",
      "Mxm ": "long",
      HtmlFileNameComponents: "long",
      // save for web output settings
      SavingFileNameComponents: "long",
      SliceFileNameComponents: "long",
      Inpt: "long",
      // levels filter
      Otpt: "long",
      // levels filter
      FrLs: "long",
      strokeStyleLineDashSet: "UntF",
      Trnf: "doub",
      nonAffineTransform: "doub",
      keyDescriptorList: "Objc",
      keyRootDescriptorList: "Objc",
      pathList: "Objc",
      gradientFillMulti: "Objc",
      solidFillMulti: "Objc",
      frameFXMulti: "Objc",
      innerShadowMulti: "Objc",
      dropShadowMulti: "Objc",
      LaSt: "Objc",
      FrIn: "Objc",
      FSts: "Objc",
      FsFr: "long",
      blendOptions: "Objc",
      sheetTimelineOptions: "Objc",
      keyList: "Objc",
      warpValues: "doub",
      selectedPin: "long",
      "Pts ": "Objc",
      SbpL: "Objc",
      pathComponents: "Objc",
      pinOffsets: "doub",
      posFinalPins: "doub",
      pinVertexIndices: "long",
      PinP: "doub",
      PnRt: "long",
      PnOv: "bool",
      PnDp: "doub",
      filterFXList: "Objc",
      puppetShapeList: "Objc",
      ShrP: "Objc",
      channelDenoise: "Objc",
      Mtrx: "long",
      compList: "long",
      textLayerSettingsWarpRect: "doub",
      Chnl: "enum",
      indices: "long",
      Mpng: "long"
    };
    var fieldToType = {};
    for (const type of Object.keys(typeToField)) {
      for (const field of typeToField[type]) {
        fieldToType[field] = type;
      }
    }
    for (const field of Object.keys(fieldToExtType)) {
      if (!fieldToType[field])
        fieldToType[field] = "Objc";
    }
    for (const field of Object.keys(fieldToArrayExtType)) {
      fieldToArrayType[field] = "Objc";
    }
    var pixelSourceOriginRoot = "PixelSource.origin";
    exports.layerStateRoot = "layerState";
    function getTypeByKey(key, value, root, parent) {
      if (key === "presetKind") {
        return typeof value === "string" ? "enum" : "long";
      }
      if (key === "null" && root === "slices") {
        return "TEXT";
      } else if (key === "groupID") {
        return root === "slices" ? "long" : "TEXT";
      } else if (key === "Sz  ") {
        return "Wdth" in value ? "Objc" : "units" in value ? "UntF" : "doub";
      } else if (key === "Type") {
        return typeof value === "string" ? "enum" : "long";
      } else if (key === "AntA") {
        return typeof value === "string" ? "enum" : "bool";
      } else if ((key === "Hrzn" || key === "Vrtc") && (parent.Type === "keyType.Pstn" || parent._classID === "Ofst" || root === pixelSourceOriginRoot)) {
        return "long";
      } else if (key === "Hrzn" || key === "Vrtc" || key === "Top " || key === "Left" || key === "Btom" || key === "Rght") {
        if (root === "slices")
          return "long";
        return typeof value === "number" ? "doub" : "UntF";
      } else if (key === "Vrsn") {
        return typeof value === "number" ? "long" : "Objc";
      } else if (key === "Rd  " || key === "Grn " || key === "Bl  ") {
        return root === "artd" ? "long" : "doub";
      } else if (key === "Trnf") {
        return Array.isArray(value) ? "VlLs" : "Objc";
      } else if (key === "alpha" && root === "slices") {
        return "long";
      } else if ((key === "Inpt" || key === "Otpt") && parent._classID === "HsbP") {
        return "enum";
      } else if ((key === "Inpt" || key === "Otpt") && parent._classID === "LvlA") {
        return "VlLs";
      } else if (key === "Intr" && typeof value === "boolean") {
        return "bool";
      } else if (key === "PgPs") {
        return "enum";
      } else if (key === "LghD" && parent._classID === "oilPaint") {
        return "long";
      } else {
        return fieldToType[key];
      }
    }
    function readAsciiStringOrClassId(reader) {
      const length = (0, psdReader_1.readInt32)(reader);
      return (0, psdReader_1.readAsciiString)(reader, length || 4);
    }
    function writeAsciiStringOrClassId(writer, value) {
      if (value.length === 4 && value !== "warp" && value !== "time" && value !== "hold" && value !== "list" && value !== "json") {
        (0, psdWriter_1.writeInt32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, value);
      } else {
        (0, psdWriter_1.writeInt32)(writer, value.length);
        for (let i = 0; i < value.length; i++) {
          (0, psdWriter_1.writeUint8)(writer, value.charCodeAt(i));
        }
      }
    }
    function readDescriptorStructure(reader, includeClass, depth = 0) {
      const struct = readClassStructure(reader);
      const object = includeClass ? { _name: struct.name, _classID: struct.classID } : {};
      const itemsCount = (0, psdReader_1.readUint32)(reader);
      for (let i = 0; i < itemsCount; i++) {
        const key = readAsciiStringOrClassId(reader);
        const type = (0, psdReader_1.readSignature)(reader);
        const data = readOSType(reader, type, includeClass, depth + 1);
        (0, engineData_1.setProperty)(object, key, data);
      }
      return object;
    }
    exports.outputSettingsRoot = "outputSettings";
    function writeDescriptorStructure(writer, name, classId, value, root) {
      var _a;
      if (writer.logMissingFeatures && !classId)
        writer.log("Missing classId for: ", name, classId, value);
      (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
      if (root === exports.outputSettingsRoot && classId === "null") {
        (0, psdWriter_1.writeInt32)(writer, 4);
        (0, psdWriter_1.writeSignature)(writer, classId);
      } else {
        writeAsciiStringOrClassId(writer, classId);
      }
      const allKeys = Object.keys(value);
      const keys = allKeys.filter((key) => key !== "_name" && key !== "_classID" && value[key] !== void 0);
      (0, psdWriter_1.writeUint32)(writer, keys.length);
      for (const key of keys) {
        let type = getTypeByKey(key, value[key], root, value);
        let childRoot = root;
        let extType = fieldToExtType[key];
        if (classId === exports.cameraRawFilterClassID) {
          type = (_a = exports.cameraRawFilterKeyTypes[key]) !== null && _a !== void 0 ? _a : "long";
          childRoot = exports.cameraRawFilterClassID;
        }
        if (key === "bounds" && root === "text") {
          extType = makeType("", "bounds");
        } else if (key === "origin") {
          type = root === "slices" ? "enum" : "Objc";
          if (classId === "PixelSource") {
            extType = nullType;
            childRoot = pixelSourceOriginRoot;
          }
        } else if (key === "Ofst" && root === exports.layerStateRoot && typeof value[key].Hrzn === "number") {
          extType = nullType;
          childRoot = pixelSourceOriginRoot;
        } else if ((key === "Cyn " || key === "Mgnt" || key === "Ylw " || key === "Blck") && value._classID === "CMYC") {
          type = "doub";
        } else if (/^PN[a-z][a-z]$/.test(key)) {
          type = "TEXT";
        } else if (/^PT[a-z][a-z]$/.test(key)) {
          type = "long";
        } else if (/^PF[a-z][a-z]$/.test(key)) {
          type = "doub";
        } else if ((key === "Rds " || key === "Thsh") && typeof value[key] === "number" && value._classID === "SmrB") {
          type = "doub";
        } else if (key === "ClSz" || key === "Rds " || key === "Amnt") {
          type = typeof value[key] === "number" ? "long" : "UntF";
        } else if ((key === "sdwM" || key === "hglM") && typeof value[key] === "string") {
          type = "enum";
        } else if (key === "blur" && typeof value[key] === "string") {
          type = "enum";
        } else if (key === "Hght" && typeof value[key] === "number" && value._classID === "Embs") {
          type = "long";
        } else if (key === "Angl" && typeof value[key] === "number" && (value._classID === "Embs" || value._classID === "smartSharpen" || value._classID === "Twrl" || value._classID === "MtnB")) {
          type = "long";
        } else if (key === "Angl" && typeof value[key] === "number") {
          type = "doub";
        } else if (key === "bounds" && root === "slices") {
          type = "Objc";
          extType = makeType("", "Rct1");
        } else if (key === "Scl ") {
          if (typeof value[key] === "object" && "Hrzn" in value[key]) {
            type = "Objc";
            extType = nullType;
          } else if (typeof value[key] === "number") {
            type = "long";
          } else {
            type = "UntF";
          }
        } else if (key === "audioClipGroupList" && keys.length === 1) {
          type = "VlLs";
        } else if ((key === "Strt" || key === "Brgh") && "H   " in value) {
          type = "doub";
        } else if (key === "Wdth" && typeof value[key] === "object") {
          type = "UntF";
        } else if (key === "Ofst" && typeof value[key] === "number") {
          type = "long";
        } else if (key === "Strt" && typeof value[key] === "object") {
          type = "Objc";
          extType = nullType;
        } else if (channels.indexOf(key) !== -1) {
          type = classId === "RGBC" && root !== "artd" || doubleColorClasses.indexOf(classId) !== -1 ? "doub" : "long";
        } else if (key === "profile") {
          type = classId === "printOutput" || classId === "proofSetup" ? "TEXT" : "tdta";
        } else if (key === "alis" && typeof value[key] === "string") {
          type = /[^\x00-\xff]/.test(value[key]) ? "TEXT" : "alis";
        } else if (key === "strokeStyleContent") {
          if (value[key]["Clr "]) {
            extType = makeType("", "solidColorLayer");
          } else if (value[key].Grad) {
            extType = makeType("", "gradientLayer");
          } else if (value[key].Ptrn) {
            extType = makeType("", "patternLayer");
          } else {
            writer.logMissingFeatures && writer.log("Invalid strokeStyleContent value", value[key]);
          }
        } else if (key === "bounds" && root === "quiltWarp") {
          extType = makeType("", "classFloatRect");
        }
        if (extType && extType.classID === "RGBC") {
          if ("H   " in value[key])
            extType = { classID: "HSBC", name: "" };
          else if ("Cyn " in value[key])
            extType = { classID: "CMYC", name: "" };
          else if ("Lmnc" in value[key])
            extType = { classID: "LbCl", name: "" };
          else if ("Gry " in value[key])
            extType = { classID: "Grsc", name: "" };
        }
        if (!type)
          type = guessOSType(value[key]);
        writeAsciiStringOrClassId(writer, key);
        (0, psdWriter_1.writeSignature)(writer, type || "long");
        writeOSType(writer, type || "long", value[key], key, extType, childRoot);
        if (writer.logMissingFeatures && !type)
          writer.log(`Missing descriptor field type for: '${key}' in`, value);
      }
    }
    var maxDescriptorDepth = 1e3;
    function readOSType(reader, type, includeClass, depth) {
      if (depth > maxDescriptorDepth)
        throw new Error("Descriptor is nested too deeply");
      switch (type) {
        case "obj ":
          return readReferenceStructure(reader);
        case "Objc":
        // Descriptor
        case "GlbO":
          return readDescriptorStructure(reader, includeClass, depth + 1);
        case "VlLs": {
          const length = (0, psdReader_1.readInt32)(reader);
          const items = [];
          for (let i = 0; i < length; i++) {
            const itemType = (0, psdReader_1.readSignature)(reader);
            items.push(readOSType(reader, itemType, includeClass, depth + 1));
          }
          return items;
        }
        case "doub":
          return (0, psdReader_1.readFloat64)(reader);
        case "UntF": {
          const units = (0, psdReader_1.readSignature)(reader);
          const value = (0, psdReader_1.readFloat64)(reader);
          const unit = unitsMap.get(units);
          if (!unit)
            throw new Error(`Invalid units: ${units}`);
          return { units: unit, value };
        }
        case "UnFl": {
          const units = (0, psdReader_1.readSignature)(reader);
          const value = (0, psdReader_1.readFloat32)(reader);
          const unit = unitsMap.get(units);
          if (!unit)
            throw new Error(`Invalid units: ${units}`);
          return { units: unit, value };
        }
        case "TEXT":
          return (0, psdReader_1.readUnicodeString)(reader);
        case "enum": {
          const enumType = readAsciiStringOrClassId(reader);
          const value = readAsciiStringOrClassId(reader);
          return `${enumType}.${value}`;
        }
        case "long":
          return (0, psdReader_1.readInt32)(reader);
        case "comp": {
          const high = (0, psdReader_1.readUint32)(reader);
          const low = (0, psdReader_1.readUint32)(reader);
          return { low, high };
        }
        case "bool":
          return !!(0, psdReader_1.readUint8)(reader);
        case "type":
        // Class
        case "GlbC":
          return readClassStructure(reader);
        case "alis": {
          const length = (0, psdReader_1.readInt32)(reader);
          return (0, psdReader_1.readAsciiString)(reader, length);
        }
        case "tdta": {
          const length = (0, psdReader_1.readInt32)(reader);
          if (length > reader.view.byteLength - reader.offset)
            throw new Error(`Invalid tdta length: ${length}`);
          return (0, psdReader_1.readBytes)(reader, length);
        }
        case "ObAr": {
          (0, psdReader_1.readInt32)(reader);
          (0, psdReader_1.readUnicodeString)(reader);
          readAsciiStringOrClassId(reader);
          const length = (0, psdReader_1.readInt32)(reader);
          const items = [];
          for (let i = 0; i < length; i++) {
            const type1 = readAsciiStringOrClassId(reader);
            (0, psdReader_1.readSignature)(reader);
            (0, psdReader_1.readSignature)(reader);
            const valuesCount = (0, psdReader_1.readInt32)(reader);
            const values = [];
            for (let j = 0; j < valuesCount; j++) {
              values.push((0, psdReader_1.readFloat64)(reader));
            }
            items.push({ type: type1, values });
          }
          return items;
        }
        case "Pth ": {
          (0, psdReader_1.readInt32)(reader);
          const sig = (0, psdReader_1.readSignature)(reader);
          (0, psdReader_1.readInt32LE)(reader);
          const charsCount = (0, psdReader_1.readInt32LE)(reader);
          const path = (0, psdReader_1.readUnicodeStringWithLengthLE)(reader, charsCount);
          return { sig, path };
        }
        default:
          throw new Error(`Invalid TySh descriptor OSType: ${type} at ${reader.offset.toString(16)}`);
      }
    }
    var ObArTypes = {
      meshPoints: "rationalPoint",
      quiltSliceX: "UntF",
      quiltSliceY: "UntF"
    };
    function writeOSType(writer, type, value, key, extType, root) {
      var _a;
      switch (type) {
        case "obj ":
          writeReferenceStructure(writer, key, value);
          break;
        case "Objc":
        // Descriptor
        case "GlbO": {
          if (typeof value !== "object")
            throw new Error(`Invalid struct value: ${JSON.stringify(value)}, key: ${key}`);
          if (!extType && !value._classID)
            throw new Error(`Missing ext type for: '${key}' (${JSON.stringify(value)})`);
          const name = value._name || (extType === null || extType === void 0 ? void 0 : extType.name) || "";
          const classID = value._classID || extType.classID;
          writeDescriptorStructure(writer, name, classID, value, root);
          break;
        }
        case "VlLs":
          if (!Array.isArray(value))
            throw new Error(`Invalid list value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeInt32)(writer, value.length);
          for (let i = 0; i < value.length; i++) {
            const type2 = root === exports.cameraRawFilterClassID ? "long" : (_a = fieldToArrayType[key]) !== null && _a !== void 0 ? _a : guessOSType(value[i]);
            (0, psdWriter_1.writeSignature)(writer, type2 || "long");
            writeOSType(writer, type2 || "long", value[i], `${key}[]`, fieldToArrayExtType[key], root);
            if (writer.logMissingFeatures && !type2)
              writer.log(`Missing descriptor array type for: '${key}' in`, value);
          }
          break;
        case "doub":
          if (typeof value !== "number")
            throw new Error(`Invalid number value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeFloat64)(writer, value);
          break;
        case "UntF": {
          const unit = unitsMapRev.get(value.units);
          if (!unit)
            throw new Error(`Invalid units: ${value.units} in ${key}`);
          (0, psdWriter_1.writeSignature)(writer, unit);
          (0, psdWriter_1.writeFloat64)(writer, value.value);
          break;
        }
        case "UnFl": {
          const unit = unitsMapRev.get(value.units);
          if (!unit)
            throw new Error(`Invalid units: ${value.units} in ${key}`);
          (0, psdWriter_1.writeSignature)(writer, unit);
          (0, psdWriter_1.writeFloat32)(writer, value.value);
          break;
        }
        case "TEXT":
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, value);
          break;
        case "enum": {
          if (typeof value !== "string")
            throw new Error(`Invalid enum value: ${JSON.stringify(value)}, key: ${key}`);
          const [_type, val] = value.split(".");
          writeAsciiStringOrClassId(writer, _type);
          writeAsciiStringOrClassId(writer, val);
          break;
        }
        case "long":
          if (typeof value !== "number")
            throw new Error(`Invalid integer value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeInt32)(writer, Math.round(value));
          break;
        case "comp":
          if (!value || typeof value !== "object")
            throw new Error(`Invalid large integer value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeUint32)(writer, value.high >>> 0);
          (0, psdWriter_1.writeUint32)(writer, value.low >>> 0);
          break;
        case "bool":
          if (typeof value !== "boolean")
            throw new Error(`Invalid boolean value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeUint8)(writer, value ? 1 : 0);
          break;
        case "type":
        // Class
        case "GlbC":
          if (!value || typeof value !== "object")
            throw new Error(`Invalid class value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, value.name || "");
          writeAsciiStringOrClassId(writer, value.classID);
          break;
        case "alis": {
          if (typeof value !== "string")
            throw new Error(`Invalid alias value: ${JSON.stringify(value)}, key: ${key}`);
          (0, psdWriter_1.writeInt32)(writer, value.length);
          for (let i = 0; i < value.length; i++) {
            (0, psdWriter_1.writeUint8)(writer, value.charCodeAt(i) & 255);
          }
          break;
        }
        case "tdta":
          (0, psdWriter_1.writeInt32)(writer, value.byteLength);
          (0, psdWriter_1.writeBytes)(writer, value);
          break;
        case "ObAr": {
          (0, psdWriter_1.writeInt32)(writer, 16);
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, "");
          const type2 = ObArTypes[key];
          if (!type2)
            throw new Error(`Not implemented ObArType for: ${key}`);
          writeAsciiStringOrClassId(writer, type2);
          (0, psdWriter_1.writeInt32)(writer, value.length);
          for (let i = 0; i < value.length; i++) {
            writeAsciiStringOrClassId(writer, value[i].type);
            (0, psdWriter_1.writeSignature)(writer, "UnFl");
            (0, psdWriter_1.writeSignature)(writer, "#Pxl");
            (0, psdWriter_1.writeInt32)(writer, value[i].values.length);
            for (let j = 0; j < value[i].values.length; j++) {
              (0, psdWriter_1.writeFloat64)(writer, value[i].values[j]);
            }
          }
          break;
        }
        case "Pth ": {
          const path = value.path + "\0";
          const length = 4 + 4 + 4 + path.length * 2;
          (0, psdWriter_1.writeInt32)(writer, length);
          (0, psdWriter_1.writeSignature)(writer, value.sig);
          (0, psdWriter_1.writeInt32LE)(writer, length);
          (0, psdWriter_1.writeInt32LE)(writer, path.length);
          (0, psdWriter_1.writeUnicodeStringWithoutLengthLE)(writer, path);
          break;
        }
        default:
          throw new Error(`Not implemented descriptor OSType: ${type}`);
      }
    }
    var referenceTypes = ["prop", "Clss", "Enmr", "rele", "Idnt", "indx", "name"];
    function isReferenceItem(value) {
      return !!value && typeof value === "object" && referenceTypes.indexOf(value.type) !== -1;
    }
    function readReferenceStructure(reader) {
      const itemsCount = (0, psdReader_1.readInt32)(reader);
      const items = [];
      for (let i = 0; i < itemsCount; i++) {
        const type = (0, psdReader_1.readSignature)(reader);
        switch (type) {
          case "prop":
            readClassStructure(reader);
            items.push(readAsciiStringOrClassId(reader));
            break;
          case "Clss":
            items.push(readClassStructure(reader));
            break;
          case "Enmr": {
            readClassStructure(reader);
            const typeID = readAsciiStringOrClassId(reader);
            const enumValue = readAsciiStringOrClassId(reader);
            items.push(`${typeID}.${enumValue}`);
            break;
          }
          case "rele":
            readClassStructure(reader);
            items.push((0, psdReader_1.readUint32)(reader));
            break;
          case "Idnt":
          // Identifier
          case "indx":
            items.push((0, psdReader_1.readInt32)(reader));
            break;
          case "name":
            readClassStructure(reader);
            items.push((0, psdReader_1.readUnicodeString)(reader));
            break;
          default:
            throw new Error(`Invalid descriptor reference type: ${type}`);
        }
      }
      return items;
    }
    function guessReferenceItem(value) {
      if (typeof value === "string") {
        const match = /^([a-z ]{4}|[a-z]{5,})\.([a-z ]+)$/i.exec(value);
        if (match) {
          return { type: "Enmr", _name: "", _classID: match[1], typeID: match[1], enumValue: match[2] };
        } else {
          return { type: "name", _name: "", _classID: "Lyr ", value };
        }
      } else if (typeof value === "number") {
        return { type: "Idnt", value };
      } else if (value && typeof value === "object" && typeof value.classID === "string") {
        return { type: "Clss", _name: value.name || "", _classID: value.classID };
      } else {
        throw new Error(`Invalid descriptor reference value: ${JSON.stringify(value)}`);
      }
    }
    function pathSelectionStateToReference(items) {
      return items.map((value) => {
        const item = guessReferenceItem(value);
        if (item.type === "Enmr")
          item._classID = "Path";
        return item;
      });
    }
    function writeReferenceStructure(writer, _key, items) {
      if (!Array.isArray(items))
        throw new Error(`Invalid reference value: ${JSON.stringify(items)}, key: ${_key}`);
      (0, psdWriter_1.writeInt32)(writer, items.length);
      for (const value of items) {
        const item = isReferenceItem(value) ? value : guessReferenceItem(value);
        (0, psdWriter_1.writeSignature)(writer, item.type);
        switch (item.type) {
          case "prop":
            writeClassStructure(writer, item._name || "", item._classID);
            writeAsciiStringOrClassId(writer, item.keyID);
            break;
          case "Clss":
            writeClassStructure(writer, item._name || "", item._classID);
            break;
          case "Enmr":
            writeClassStructure(writer, item._name || "", item._classID);
            writeAsciiStringOrClassId(writer, item.typeID);
            writeAsciiStringOrClassId(writer, item.enumValue);
            break;
          case "rele":
            writeClassStructure(writer, item._name || "", item._classID);
            (0, psdWriter_1.writeUint32)(writer, item.value);
            break;
          case "Idnt":
          // Identifier
          case "indx":
            (0, psdWriter_1.writeInt32)(writer, item.value);
            break;
          case "name":
            writeClassStructure(writer, item._name || "", item._classID);
            (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, `${item.value}`);
            break;
          default:
            throw new Error(`Invalid descriptor reference type: ${item.type}`);
        }
      }
      return items;
    }
    function readClassStructure(reader) {
      const name = (0, psdReader_1.readUnicodeString)(reader);
      const classID = readAsciiStringOrClassId(reader);
      return { name, classID };
    }
    function writeClassStructure(writer, name, classID) {
      (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
      writeAsciiStringOrClassId(writer, classID);
    }
    function readVersionAndDescriptor(reader, includeClass = false) {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 16)
        throw new Error(`Invalid descriptor version: ${version}`);
      const desc = readDescriptorStructure(reader, includeClass);
      return desc;
    }
    function writeVersionAndDescriptor(writer, name, classID, descriptor, root = "") {
      (0, psdWriter_1.writeUint32)(writer, 16);
      writeDescriptorStructure(writer, name, classID, descriptor, root);
    }
    function horzVrtcToXY(hv) {
      return { x: hv.Hrzn, y: hv.Vrtc };
    }
    function xyToHorzVrtc(xy) {
      return { Hrzn: xy.x, Vrtc: xy.y };
    }
    function descBoundsToBounds(desc) {
      return {
        top: parseUnits(desc["Top "]),
        left: parseUnits(desc.Left),
        right: parseUnits(desc.Rght),
        bottom: parseUnits(desc.Btom)
      };
    }
    function boundsToDescBounds(bounds) {
      return {
        Left: unitsValue(bounds.left, "bounds.left"),
        ["Top "]: unitsValue(bounds.top, "bounds.top"),
        Rght: unitsValue(bounds.right, "bounds.right"),
        Btom: unitsValue(bounds.bottom, "bounds.bottom")
      };
    }
    function parseFxObject(fx) {
      const stroke = {
        enabled: !!fx.enab,
        position: exports.FStl.decode(fx.Styl),
        fillType: exports.FrFl.decode(fx.PntT),
        blendMode: exports.BlnM.decode(fx["Md  "]),
        opacity: parsePercent(fx.Opct),
        size: parseUnitsOrNumber(fx["Sz  "])
        // stored as number (pixels) in old versions
      };
      if (fx.present !== void 0)
        stroke.present = fx.present;
      if (fx.showInDialog !== void 0)
        stroke.showInDialog = fx.showInDialog;
      if (fx.overprint !== void 0)
        stroke.overprint = fx.overprint;
      if (fx["Clr "])
        stroke.color = parseColor(fx["Clr "]);
      if (fx.Grad)
        stroke.gradient = parseGradientContent(fx);
      if (fx.Ptrn)
        stroke.pattern = parsePatternContent(fx);
      return stroke;
    }
    function serializeFxObject(stroke) {
      let FrFX = {};
      FrFX.enab = !!stroke.enabled;
      if (stroke.present !== void 0)
        FrFX.present = !!stroke.present;
      if (stroke.showInDialog !== void 0)
        FrFX.showInDialog = !!stroke.showInDialog;
      FrFX.Styl = exports.FStl.encode(stroke.position);
      FrFX.PntT = exports.FrFl.encode(stroke.fillType);
      FrFX["Md  "] = exports.BlnM.encode(stroke.blendMode);
      FrFX.Opct = unitsPercent(stroke.opacity);
      FrFX["Sz  "] = unitsValue(stroke.size, "size");
      if (stroke.color)
        FrFX["Clr "] = serializeColor(stroke.color);
      if (stroke.gradient)
        FrFX = Object.assign(Object.assign({}, FrFX), serializeGradientContent(stroke.gradient));
      if (stroke.pattern)
        FrFX = Object.assign(Object.assign({}, FrFX), serializePatternContent(stroke.pattern));
      if (stroke.overprint !== void 0)
        FrFX.overprint = !!stroke.overprint;
      return FrFX;
    }
    function serializeEffects(e, writer, multi) {
      var _a, _b, _c;
      const info = multi ? {
        "Scl ": unitsPercentF((_a = e.scale) !== null && _a !== void 0 ? _a : 1),
        masterFXSwitch: !e.disabled
      } : {
        masterFXSwitch: !e.disabled,
        "Scl ": unitsPercentF((_b = e.scale) !== null && _b !== void 0 ? _b : 1)
      };
      const arrayKeys = ["dropShadow", "innerShadow", "solidFill", "gradientOverlay", "stroke"];
      for (const key of arrayKeys) {
        if (e[key] && !Array.isArray(e[key]))
          throw new Error(`${key} should be an array`);
      }
      const useMulti = (arr) => !!arr && arr.length > 1 && multi;
      const useSingle = (arr) => !!arr && arr.length >= 1 && (!multi || arr.length === 1);
      if (useSingle(e.dropShadow))
        info.DrSh = serializeEffectObject(e.dropShadow[0], "dropShadow", writer);
      if (useMulti(e.dropShadow))
        info.dropShadowMulti = e.dropShadow.map((i) => serializeEffectObject(i, "dropShadow", writer));
      if (useSingle(e.innerShadow))
        info.IrSh = serializeEffectObject(e.innerShadow[0], "innerShadow", writer);
      if (useMulti(e.innerShadow))
        info.innerShadowMulti = e.innerShadow.map((i) => serializeEffectObject(i, "innerShadow", writer));
      if (e.outerGlow)
        info.OrGl = serializeEffectObject(e.outerGlow, "outerGlow", writer);
      if (useMulti(e.solidFill))
        info.solidFillMulti = e.solidFill.map((i) => serializeEffectObject(i, "solidFill", writer));
      if (useMulti(e.gradientOverlay))
        info.gradientFillMulti = e.gradientOverlay.map((i) => serializeEffectObject(i, "gradientOverlay", writer));
      if (useMulti(e.stroke))
        info.frameFXMulti = e.stroke.map((i) => serializeFxObject(i));
      if (e.innerGlow)
        info.IrGl = serializeEffectObject(e.innerGlow, "innerGlow", writer);
      if (e.bevel)
        info.ebbl = serializeEffectObject(e.bevel, "bevel", writer);
      if (useSingle(e.solidFill))
        info.SoFi = serializeEffectObject(e.solidFill[0], "solidFill", writer);
      if (e.patternOverlay)
        info.patternFill = serializeEffectObject(e.patternOverlay, "patternOverlay", writer);
      if (useSingle(e.gradientOverlay))
        info.GrFl = serializeEffectObject(e.gradientOverlay[0], "gradientOverlay", writer);
      if (e.satin)
        info.ChFX = serializeEffectObject(e.satin, "satin", writer);
      if (useSingle(e.stroke))
        info.FrFX = serializeFxObject((_c = e.stroke) === null || _c === void 0 ? void 0 : _c[0]);
      if (multi) {
        info.numModifyingFX = 0;
        for (const key of Object.keys(e)) {
          const value = e[key];
          if (value == null || typeof value !== "object")
            continue;
          if (Array.isArray(value)) {
            for (const effect of value) {
              if (effect === null || effect === void 0 ? void 0 : effect.enabled)
                info.numModifyingFX++;
            }
          } else if (value.enabled) {
            info.numModifyingFX++;
          }
        }
      }
      return info;
    }
    function parseEffects(info, reader) {
      const effects = {};
      const _a = info, { _name, _classID, "Scl ": scale, masterFXSwitch, DrSh, dropShadowMulti, IrSh, innerShadowMulti, OrGl, IrGl, ebbl, SoFi, solidFillMulti, patternFill, GrFl, gradientFillMulti, ChFX, FrFX, frameFXMulti, numModifyingFX } = _a, rest = __rest(_a, ["_name", "_classID", "Scl ", "masterFXSwitch", "DrSh", "dropShadowMulti", "IrSh", "innerShadowMulti", "OrGl", "IrGl", "ebbl", "SoFi", "solidFillMulti", "patternFill", "GrFl", "gradientFillMulti", "ChFX", "FrFX", "frameFXMulti", "numModifyingFX"]);
      if (!masterFXSwitch)
        effects.disabled = true;
      if (scale)
        effects.scale = parsePercent(scale);
      if (DrSh)
        effects.dropShadow = [parseEffectObject(DrSh, reader)];
      if (dropShadowMulti)
        effects.dropShadow = dropShadowMulti.map((i) => parseEffectObject(i, reader));
      if (IrSh)
        effects.innerShadow = [parseEffectObject(IrSh, reader)];
      if (innerShadowMulti)
        effects.innerShadow = innerShadowMulti.map((i) => parseEffectObject(i, reader));
      if (OrGl)
        effects.outerGlow = parseEffectObject(OrGl, reader);
      if (IrGl)
        effects.innerGlow = parseEffectObject(IrGl, reader);
      if (ebbl)
        effects.bevel = parseEffectObject(ebbl, reader, "bevel");
      if (SoFi)
        effects.solidFill = [parseEffectObject(SoFi, reader)];
      if (solidFillMulti)
        effects.solidFill = solidFillMulti.map((i) => parseEffectObject(i, reader));
      if (patternFill)
        effects.patternOverlay = parseEffectObject(patternFill, reader);
      if (GrFl)
        effects.gradientOverlay = [parseEffectObject(GrFl, reader)];
      if (gradientFillMulti)
        effects.gradientOverlay = gradientFillMulti.map((i) => parseEffectObject(i, reader));
      if (ChFX)
        effects.satin = parseEffectObject(ChFX, reader);
      if (FrFX)
        effects.stroke = [parseFxObject(FrFX)];
      if (frameFXMulti)
        effects.stroke = frameFXMulti.map((i) => parseFxObject(i));
      if (reader.logMissingFeatures && Object.keys(rest).length)
        reader.log("Unhandled effect keys:", rest);
      return effects;
    }
    function parseKeyList(keyList, reader) {
      const keys = [];
      for (let j = 0; j < keyList.length; j++) {
        const key = keyList[j];
        const { time: { denominator, numerator }, selected, animKey } = key;
        const time = { numerator, denominator };
        const interpolation = exports.animInterpStyleEnum.decode(key.animInterpStyle);
        switch (animKey.Type) {
          case "keyType.Opct":
            keys.push({ interpolation, time, selected, type: "opacity", value: parsePercent(animKey.Opct) });
            break;
          case "keyType.Pstn":
            keys.push({ interpolation, time, selected, type: "position", x: animKey.Hrzn, y: animKey.Vrtc });
            break;
          case "keyType.Trnf":
            keys.push({
              interpolation,
              time,
              selected,
              type: "transform",
              scale: horzVrtcToXY(animKey["Scl "]),
              skew: horzVrtcToXY(animKey.Skew),
              rotation: animKey.rotation,
              translation: horzVrtcToXY(animKey.translation)
            });
            break;
          case "keyType.sheetStyle": {
            const key2 = { interpolation, time, selected, type: "style" };
            if (animKey.sheetStyle.Lefx)
              key2.style = parseEffects(animKey.sheetStyle.Lefx, reader);
            keys.push(key2);
            break;
          }
          case "keyType.globalLighting": {
            keys.push({
              interpolation,
              time,
              selected,
              type: "globalLighting",
              globalAngle: animKey.gblA,
              globalAltitude: animKey.globalAltitude
            });
            break;
          }
          default:
            throw new Error(`Unsupported keyType value`);
        }
      }
      return keys;
    }
    function serializeKeyList(keys, writer) {
      const keyList = [];
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const { time, selected = false, interpolation } = key;
        const animInterpStyle = exports.animInterpStyleEnum.encode(interpolation);
        let animKey;
        switch (key.type) {
          case "opacity":
            animKey = { Type: "keyType.Opct", Opct: unitsPercent(key.value) };
            break;
          case "position":
            animKey = { Type: "keyType.Pstn", Hrzn: key.x, Vrtc: key.y };
            break;
          case "transform":
            animKey = { Type: "keyType.Trnf", "Scl ": xyToHorzVrtc(key.scale), Skew: xyToHorzVrtc(key.skew), rotation: key.rotation, translation: xyToHorzVrtc(key.translation) };
            break;
          case "style":
            animKey = { Type: "keyType.sheetStyle", sheetStyle: { Vrsn: 1, blendOptions: {} } };
            if (key.style)
              animKey.sheetStyle = { Vrsn: 1, Lefx: serializeEffects(key.style, writer, false), blendOptions: {} };
            break;
          case "globalLighting": {
            animKey = { Type: "keyType.globalLighting", gblA: key.globalAngle, globalAltitude: key.globalAltitude };
            break;
          }
          default:
            throw new Error(`Unsupported keyType value`);
        }
        keyList.push({ Vrsn: 1, animInterpStyle, time, animKey, selected });
      }
      return keyList;
    }
    function parseTrackList(trackList, reader) {
      const tracks = [];
      for (let i = 0; i < trackList.length; i++) {
        const tr = trackList[i];
        const track = {
          type: exports.stdTrackID.decode(tr.trackID),
          enabled: tr.enab,
          keys: parseKeyList(tr.keyList, reader)
        };
        if (tr.effectParams) {
          track.effectParams = {
            fillCanvas: tr.effectParams.fillCanvas,
            zoomOrigin: tr.effectParams.zoomOrigin,
            keys: parseKeyList(tr.effectParams.keyList, reader)
          };
        }
        tracks.push(track);
      }
      return tracks;
    }
    function serializeTrackList(tracks, writer) {
      const trackList = [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        trackList.push(Object.assign(Object.assign({ trackID: exports.stdTrackID.encode(t.type), Vrsn: 1, enab: !!t.enabled, Effc: !!t.effectParams }, t.effectParams ? {
          effectParams: {
            keyList: serializeKeyList(t.effectParams.keys, writer),
            fillCanvas: t.effectParams.fillCanvas,
            zoomOrigin: t.effectParams.zoomOrigin
          }
        } : {}), { keyList: serializeKeyList(t.keys, writer) }));
      }
      return trackList;
    }
    function parseEffectObject(obj, reader, objName) {
      const result = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        switch (key) {
          case "enab":
            result.enabled = !!val;
            break;
          case "uglg":
            result.useGlobalLight = !!val;
            break;
          case "AntA":
            result.antialiased = !!val;
            break;
          case "Algn":
            result.align = !!val;
            break;
          case "Dthr":
            result.dither = !!val;
            break;
          case "Invr":
            result.invert = !!val;
            break;
          case "Rvrs":
            result.reverse = !!val;
            break;
          case "Clr ":
            result.color = parseColor(val);
            break;
          case "hglC":
            result.highlightColor = parseColor(val);
            break;
          case "sdwC":
            result.shadowColor = parseColor(val);
            break;
          case "Styl":
            result.position = exports.FStl.decode(val);
            break;
          case "Md  ":
            result.blendMode = exports.BlnM.decode(val);
            break;
          case "hglM":
            result.highlightBlendMode = exports.BlnM.decode(val);
            break;
          case "sdwM":
            result.shadowBlendMode = exports.BlnM.decode(val);
            break;
          case "bvlS":
            result.style = exports.BESl.decode(val);
            break;
          case "bvlD":
            result.direction = exports.BESs.decode(val);
            break;
          case "bvlT":
            result.technique = exports.bvlT.decode(val);
            break;
          case "GlwT":
            result.technique = exports.BETE.decode(val);
            break;
          case "glwS":
            result.source = exports.IGSr.decode(val);
            break;
          case "Type":
            result.type = exports.GrdT.decode(val);
            break;
          case "gs99":
          // gradient overlay
          case "gradientsInterpolationMethod":
            result.interpolationMethod = exports.gradientInterpolationMethodType.decode(val);
            break;
          case "Opct":
            result.opacity = parsePercent(val);
            break;
          case "hglO":
            result.highlightOpacity = parsePercent(val);
            break;
          case "sdwO":
            result.shadowOpacity = parsePercent(val);
            break;
          case "lagl":
            result.angle = parseAngle(val);
            break;
          case "Angl":
            result.angle = parseAngle(val);
            break;
          case "Lald":
            result.altitude = parseAngle(val);
            break;
          case "Sftn":
            result.soften = parseUnits(val);
            break;
          case "srgR":
            result.strength = parsePercent(val);
            break;
          case "blur":
            result.size = parseUnits(val);
            break;
          case "Nose":
            result.noise = parsePercent(val);
            break;
          case "Inpr":
            result.range = parsePercent(val);
            break;
          case "Ckmt":
            result.choke = parseUnits(val);
            break;
          case "ShdN":
            result.jitter = parsePercent(val);
            break;
          case "Dstn":
            result.distance = parseUnits(val);
            break;
          case "Scl ":
            result.scale = parsePercent(val);
            break;
          case "Ptrn":
            result.pattern = { name: val["Nm  "], id: val.Idnt };
            break;
          case "phase":
            result.phase = parsePhase(val);
            break;
          case "Ofst":
            result.offset = { x: parsePercent(val.Hrzn), y: parsePercent(val.Vrtc) };
            break;
          case "MpgS":
          case "TrnS": {
            const contour = {
              name: val["Nm  "],
              curve: val["Crv "].map((p) => p.Cnty !== void 0 ? { x: p.Hrzn, y: p.Vrtc, curved: p.Cnty } : { x: p.Hrzn, y: p.Vrtc })
            };
            if (objName === "bevel" && key === "MpgS") {
              result.shapeContour = contour;
            } else {
              result.contour = contour;
            }
            break;
          }
          case "Grad":
            result.gradient = parseGradient(val);
            break;
          case "useTexture":
          case "useShape":
          case "layerConceals":
          case "present":
          case "showInDialog":
          case "antialiasGloss":
            result[key] = val;
            break;
          case "_name":
          case "_classID":
            break;
          default:
            reader.logMissingFeatures && reader.log(`Invalid effect key: '${key}', value:`, val);
        }
      }
      return result;
    }
    function serializeEffectObject(obj, objName, writer) {
      const result = {
        enab: false
      };
      if (objName === "dropShadow") {
        result.TrnS = { "Nm  ": "", "Crv ": [] };
      }
      for (const objKey of Object.keys(obj)) {
        const key = objKey;
        const val = obj[key];
        switch (key) {
          case "enabled":
            result.enab = !!val;
            break;
          case "useGlobalLight":
            result.uglg = !!val;
            break;
          case "antialiased":
            result.AntA = !!val;
            break;
          case "align":
            result.Algn = !!val;
            break;
          case "dither":
            result.Dthr = !!val;
            break;
          case "invert":
            result.Invr = !!val;
            break;
          case "reverse":
            result.Rvrs = !!val;
            break;
          case "color":
            result["Clr "] = serializeColor(val);
            break;
          case "highlightColor":
            result.hglC = serializeColor(val);
            break;
          case "shadowColor":
            result.sdwC = serializeColor(val);
            break;
          case "position":
            result.Styl = exports.FStl.encode(val);
            break;
          case "blendMode":
            result["Md  "] = exports.BlnM.encode(val);
            break;
          case "highlightBlendMode":
            result.hglM = exports.BlnM.encode(val);
            break;
          case "shadowBlendMode":
            result.sdwM = exports.BlnM.encode(val);
            break;
          case "style":
            result.bvlS = exports.BESl.encode(val);
            break;
          case "direction":
            result.bvlD = exports.BESs.encode(val);
            break;
          case "technique":
            if (objName === "bevel") {
              result.bvlT = exports.bvlT.encode(val);
            } else {
              result.GlwT = exports.BETE.encode(val);
            }
            break;
          case "source":
            result.glwS = exports.IGSr.encode(val);
            break;
          case "type":
            result.Type = exports.GrdT.encode(val);
            break;
          case "interpolationMethod":
            result[objName === "outerGlow" || objName === "innerGlow" ? "gradientsInterpolationMethod" : "gs99"] = exports.gradientInterpolationMethodType.encode(val);
            break;
          case "opacity":
            result.Opct = unitsPercent(val);
            break;
          case "highlightOpacity":
            result.hglO = unitsPercent(val);
            break;
          case "shadowOpacity":
            result.sdwO = unitsPercent(val);
            break;
          case "angle":
            if (objName === "gradientOverlay" || objName === "patternOverlay") {
              result.Angl = unitsAngle(val);
            } else {
              result.lagl = unitsAngle(val);
            }
            break;
          case "altitude":
            result.Lald = unitsAngle(val);
            break;
          case "soften":
            result.Sftn = unitsValue(val, key);
            break;
          case "strength":
            result.srgR = unitsPercent(val);
            break;
          case "size":
            result.blur = unitsValue(val, key);
            break;
          case "noise":
            result.Nose = unitsPercent(val);
            break;
          case "range":
            result.Inpr = unitsPercent(val);
            break;
          case "choke":
            result.Ckmt = unitsValue(val, key);
            break;
          case "jitter":
            result.ShdN = unitsPercent(val);
            break;
          case "distance":
            result.Dstn = unitsValue(val, key);
            break;
          case "scale":
            result["Scl "] = unitsPercent(val);
            break;
          case "pattern":
            result.Ptrn = { "Nm  ": val.name, Idnt: val.id };
            break;
          case "phase":
            result.phase = { Hrzn: val.x, Vrtc: val.y };
            break;
          case "offset":
            result.Ofst = { Hrzn: unitsPercentF(val.x), Vrtc: unitsPercentF(val.y) };
            break;
          case "contour":
            result[objName === "satin" ? "MpgS" : "TrnS"] = serializeContour(val);
            break;
          case "shapeContour":
            result.MpgS = serializeContour(val);
            break;
          case "gradient":
            result.Grad = serializeGradient(val);
            break;
          case "useTexture":
          case "useShape":
          case "layerConceals":
          case "present":
          case "showInDialog":
          case "antialiasGloss":
            result[key] = val;
            break;
          default:
            writer.logMissingFeatures && writer.log(`Invalid effect key: '${key}', value:`, val);
        }
      }
      return result;
    }
    function serializeContour(contour) {
      return {
        "Nm  ": contour.name,
        "Crv ": contour.curve.map((p) => p.curved !== void 0 ? { Hrzn: p.x, Vrtc: p.y, Cnty: !!p.curved } : { Hrzn: p.x, Vrtc: p.y })
      };
    }
    function parseGradient(grad) {
      if (grad.GrdF === "GrdF.CstS") {
        const samples = 4096;
        return {
          type: "solid",
          name: grad["Nm  "],
          smoothness: grad.Intr / 4096,
          colorStops: grad.Clrs.map((s) => {
            const stop = {
              color: s["Clr "] ? parseColor(s["Clr "]) : { r: 0, g: 0, b: 0 },
              location: s.Lctn / samples,
              midpoint: s.Mdpn / 100
            };
            if (s.Type) {
              try {
                const type = exports.Clry.decode(s.Type);
                if (type !== "user")
                  stop.type = type;
              } catch (_a) {
              }
            }
            return stop;
          }),
          opacityStops: grad.Trns.map((s) => ({
            opacity: parsePercent(s.Opct),
            location: s.Lctn / samples,
            midpoint: s.Mdpn / 100
          }))
        };
      } else {
        return {
          type: "noise",
          name: grad["Nm  "],
          roughness: grad.Smth / 4096,
          colorModel: exports.ClrS.decode(grad.ClrS),
          randomSeed: grad.RndS,
          restrictColors: !!grad.VctC,
          addTransparency: !!grad.ShTr,
          min: grad["Mnm "].map((x) => x / 100),
          max: grad["Mxm "].map((x) => x / 100)
        };
      }
    }
    function serializeGradient(grad) {
      var _a, _b;
      if (grad.type === "solid") {
        const samples = 4096;
        return {
          "Nm  ": grad.name || "",
          GrdF: "GrdF.CstS",
          Intr: Math.round(((_a = grad.smoothness) !== null && _a !== void 0 ? _a : 1) * 4096),
          Clrs: grad.colorStops.map((s) => {
            var _a2, _b2;
            return {
              "Clr ": serializeColor(s.color),
              Type: exports.Clry.encode((_a2 = s.type) !== null && _a2 !== void 0 ? _a2 : "user"),
              Lctn: Math.round(s.location * samples),
              Mdpn: Math.round(((_b2 = s.midpoint) !== null && _b2 !== void 0 ? _b2 : 0.5) * 100)
            };
          }),
          Trns: grad.opacityStops.map((s) => {
            var _a2;
            return {
              Opct: unitsPercentF(s.opacity),
              Lctn: Math.round(s.location * samples),
              Mdpn: Math.round(((_a2 = s.midpoint) !== null && _a2 !== void 0 ? _a2 : 0.5) * 100)
            };
          })
        };
      } else {
        return {
          GrdF: "GrdF.ClNs",
          "Nm  ": grad.name || "",
          ShTr: !!grad.addTransparency,
          VctC: !!grad.restrictColors,
          ClrS: exports.ClrS.encode(grad.colorModel),
          RndS: grad.randomSeed || 0,
          Smth: Math.round(((_b = grad.roughness) !== null && _b !== void 0 ? _b : 1) * 4096),
          "Mnm ": (grad.min || [0, 0, 0, 0]).map((x) => Math.round(x * 100)),
          "Mxm ": (grad.max || [1, 1, 1, 1]).map((x) => Math.round(x * 100))
        };
      }
    }
    function parseGradientContent(descriptor) {
      const result = parseGradient(descriptor.Grad);
      result.style = exports.GrdT.decode(descriptor.Type);
      if (descriptor.Dthr !== void 0)
        result.dither = descriptor.Dthr;
      if (descriptor.gradientsInterpolationMethod !== void 0)
        result.interpolationMethod = exports.gradientInterpolationMethodType.decode(descriptor.gradientsInterpolationMethod);
      if (descriptor.Rvrs !== void 0)
        result.reverse = descriptor.Rvrs;
      if (descriptor.Angl !== void 0)
        result.angle = parseAngle(descriptor.Angl);
      if (descriptor["Scl "] !== void 0)
        result.scale = parsePercent(descriptor["Scl "]);
      if (descriptor.Algn !== void 0)
        result.align = descriptor.Algn;
      if (descriptor.Ofst !== void 0) {
        result.offset = {
          x: parsePercent(descriptor.Ofst.Hrzn),
          y: parsePercent(descriptor.Ofst.Vrtc)
        };
      }
      if (descriptor.gradientAspectRatio !== void 0)
        result.aspectRatio = descriptor.gradientAspectRatio;
      if (descriptor.noisePreSeed !== void 0)
        result.noisePreSeed = descriptor.noisePreSeed;
      return result;
    }
    function parsePhase({ Hrzn, Vrtc }) {
      return {
        x: typeof Hrzn === "number" ? Hrzn : Hrzn.value,
        y: typeof Vrtc === "number" ? Vrtc : Vrtc.value
      };
    }
    function parsePatternContent(descriptor) {
      const result = {
        name: descriptor.Ptrn["Nm  "],
        id: descriptor.Ptrn.Idnt
      };
      if (descriptor.Algn !== void 0)
        result.align = descriptor.Algn;
      if (descriptor.Lnkd !== void 0)
        result.linked = descriptor.Lnkd;
      if (descriptor.phase !== void 0)
        result.phase = parsePhase(descriptor.phase);
      if (descriptor["Scl "] !== void 0)
        result.scale = parsePercent(descriptor["Scl "]);
      if (descriptor.Angl !== void 0)
        result.angle = parseAngle(descriptor.Angl);
      return result;
    }
    function parseVectorContent(descriptor) {
      if ("Grad" in descriptor) {
        return parseGradientContent(descriptor);
      } else if ("Ptrn" in descriptor) {
        return Object.assign({ type: "pattern" }, parsePatternContent(descriptor));
      } else if ("Clr " in descriptor) {
        return { type: "color", color: parseColor(descriptor["Clr "]) };
      } else {
        throw new Error("Invalid vector content");
      }
    }
    function serializeGradientContent(content) {
      const result = {};
      if (content.dither !== void 0)
        result.Dthr = content.dither;
      if (content.interpolationMethod !== void 0)
        result.gradientsInterpolationMethod = exports.gradientInterpolationMethodType.encode(content.interpolationMethod);
      if (content.reverse !== void 0)
        result.Rvrs = content.reverse;
      if (content.aspectRatio !== void 0)
        result.gradientAspectRatio = content.aspectRatio;
      if (content.angle !== void 0)
        result.Angl = unitsAngle(content.angle);
      result.Type = exports.GrdT.encode(content.style);
      if (content.align !== void 0)
        result.Algn = content.align;
      if (content.scale !== void 0)
        result["Scl "] = unitsPercentF(content.scale);
      if (content.offset) {
        result.Ofst = {
          Hrzn: unitsPercentF(content.offset.x),
          Vrtc: unitsPercentF(content.offset.y)
        };
      }
      if (content.noisePreSeed !== void 0)
        result.noisePreSeed = content.noisePreSeed;
      result.Grad = serializeGradient(content);
      return result;
    }
    function serializePatternContent(content) {
      const result = {
        Ptrn: {
          "Nm  ": content.name || "",
          Idnt: content.id || ""
        }
      };
      if (content.align !== void 0)
        result.Algn = !!content.align;
      if (content.linked !== void 0)
        result.Lnkd = !!content.linked;
      if (content.phase !== void 0)
        result.phase = { Hrzn: content.phase.x, Vrtc: content.phase.y };
      if (content.scale !== void 0)
        result["Scl "] = unitsPercentF(content.scale);
      if (content.angle !== void 0)
        result.Angl = unitsAngle(content.angle);
      return result;
    }
    function serializeVectorContent(content) {
      if (content.type === "color") {
        return { key: "SoCo", descriptor: { "Clr ": serializeColor(content.color) } };
      } else if (content.type === "pattern") {
        return { key: "PtFl", descriptor: serializePatternContent(content) };
      } else {
        return { key: "GdFl", descriptor: serializeGradientContent(content) };
      }
    }
    var colorConversions = {
      // key: [descriptor -> color, color -> descriptor]
      "H   ": [(x) => x / 360, (x) => x * 360],
      // angle
      Strt: [(x) => x / 100, (x) => x * 100],
      Brgh: [(x) => x / 100, (x) => x * 100],
      "Cyn ": [(x) => x * 255 / 100, (x) => x * 100 / 255],
      Mgnt: [(x) => x * 255 / 100, (x) => x * 100 / 255],
      "Ylw ": [(x) => x * 255 / 100, (x) => x * 100 / 255],
      Blck: [(x) => x * 255 / 100, (x) => x * 100 / 255],
      "Gry ": [(x) => x * 255 / 100, (x) => x * 100 / 255],
      Lmnc: [(x) => x / 100, (x) => x * 100],
      "A   ": [helpers_1.normalizeLabAB, helpers_1.denormalizeLabAB],
      "B   ": [helpers_1.normalizeLabAB, helpers_1.denormalizeLabAB]
    };
    function colorToDescriptorValue(key, value) {
      const conversion = colorConversions[key];
      if (!conversion)
        return value;
      const [from, to] = conversion;
      const result = to(value);
      if (!isFinite(result))
        return result;
      for (let precision = 1; precision < 17; precision++) {
        const candidate = +result.toPrecision(precision);
        if (from(candidate) === value)
          return candidate;
      }
      return result;
    }
    function isBookColor(color) {
      return color._classID === "BkCl" || "Bk  " in color || "bookID" in color;
    }
    function parseColor(color) {
      var _a, _b, _c;
      const result = parseColorValues(color);
      if (isBookColor(color)) {
        const book = color;
        const key = book.bookKey;
        result.book = {
          book: (_a = book["Bk  "]) !== null && _a !== void 0 ? _a : "",
          name: (_b = book["Nm  "]) !== null && _b !== void 0 ? _b : "",
          bookID: (_c = book.bookID) !== null && _c !== void 0 ? _c : 0,
          bookKey: typeof key === "string" ? key : key ? String.fromCharCode(...Array.from(key)) : ""
        };
      }
      return result;
    }
    function parseColorValues(color) {
      if ("H   " in color) {
        return { h: parsePercentOrAngle(color["H   "]), s: color.Strt / 100, b: color.Brgh / 100 };
      } else if ("Rd  " in color) {
        return { r: color["Rd  "], g: color["Grn "], b: color["Bl  "] };
      } else if ("Cyn " in color) {
        return {
          c: color["Cyn "] * 255 / 100,
          m: color.Mgnt * 255 / 100,
          y: color["Ylw "] * 255 / 100,
          k: color.Blck * 255 / 100
        };
      } else if ("Gry " in color) {
        return { k: color["Gry "] * 255 / 100 };
      } else if ("Lmnc" in color) {
        return { l: color.Lmnc / 100, a: (0, helpers_1.normalizeLabAB)(color["A   "]), b: (0, helpers_1.normalizeLabAB)(color["B   "]) };
      } else if ("redFloat" in color) {
        return { fr: color.redFloat, fg: color.greenFloat, fb: color.blueFloat };
      } else if (isBookColor(color)) {
        return { r: 0, g: 0, b: 0 };
      } else {
        throw new Error("Unsupported color descriptor");
      }
    }
    function serializeColor(color) {
      const result = serializeColorValues(color);
      if (color === null || color === void 0 ? void 0 : color.book) {
        const { book, name, bookID, bookKey } = color.book;
        const key = new Uint8Array(bookKey.length);
        for (let i = 0; i < key.length; i++)
          key[i] = bookKey.charCodeAt(i) & 255;
        Object.assign(result, { "Bk  ": book, "Nm  ": name, bookID, bookKey: key });
      }
      return result;
    }
    function serializeColorValues(color) {
      if (!color) {
        return { _name: "", _classID: "RGBC", "Rd  ": 0, "Grn ": 0, "Bl  ": 0 };
      } else if ("r" in color) {
        return { _name: "", _classID: "RGBC", "Rd  ": color.r || 0, "Grn ": color.g || 0, "Bl  ": color.b || 0 };
      } else if ("fr" in color) {
        return { _name: "", _classID: "RGBC", redFloat: color.fr, greenFloat: color.fg, blueFloat: color.fb };
      } else if ("h" in color) {
        return {
          _name: "",
          _classID: "HSBC",
          "H   ": unitsAngle(colorToDescriptorValue("H   ", color.h || 0)),
          Strt: colorToDescriptorValue("Strt", color.s || 0),
          Brgh: colorToDescriptorValue("Brgh", color.b || 0)
        };
      } else if ("c" in color) {
        return {
          _name: "",
          _classID: "CMYC",
          "Cyn ": colorToDescriptorValue("Cyn ", color.c || 0),
          Mgnt: colorToDescriptorValue("Mgnt", color.m || 0),
          "Ylw ": colorToDescriptorValue("Ylw ", color.y || 0),
          Blck: colorToDescriptorValue("Blck", color.k || 0)
        };
      } else if ("l" in color) {
        return {
          _name: "",
          _classID: "LbCl",
          Lmnc: colorToDescriptorValue("Lmnc", color.l || 0),
          "A   ": colorToDescriptorValue("A   ", color.a || 0),
          "B   ": colorToDescriptorValue("B   ", color.b || 0)
        };
      } else if ("k" in color) {
        return { _name: "", _classID: "Grsc", "Gry ": colorToDescriptorValue("Gry ", color.k || 0) };
      } else {
        throw new Error("Invalid color value");
      }
    }
    function parseAngle(x) {
      if (x === void 0)
        return 0;
      if (x.units !== "Angle")
        throw new Error(`Invalid units: ${x.units}`);
      return x.value;
    }
    function parsePercent(x) {
      if (x === void 0)
        return 1;
      if (x.units !== "Percent")
        throw new Error(`Invalid units: ${x.units}`);
      return x.value / 100;
    }
    function parsePercentOrAngle(x) {
      if (x === void 0)
        return 1;
      if (x.units === "Percent")
        return x.value / 100;
      if (x.units === "Angle")
        return x.value / 360;
      throw new Error(`Invalid units: ${x.units}`);
    }
    function parseUnits({ units, value }) {
      if (units !== "Pixels" && units !== "Millimeters" && units !== "Points" && units !== "None" && units !== "Picas" && units !== "Inches" && units !== "Centimeters" && units !== "Density" && units !== "Distance") {
        throw new Error(`Invalid units: ${JSON.stringify({ units, value })}`);
      }
      return { value, units };
    }
    function parseUnitsOrNumber(value, units = "Pixels") {
      if (typeof value === "number")
        return { value, units };
      return parseUnits(value);
    }
    function parseUnitsToNumber({ units, value }, expectedUnits) {
      if (units !== expectedUnits)
        throw new Error(`Invalid units: ${JSON.stringify({ units, value })}`);
      return value;
    }
    function unitsAngle(value) {
      return { units: "Angle", value: value || 0 };
    }
    function unitsPercent(value) {
      return { units: "Percent", value: Math.round((value || 0) * 100) };
    }
    function unitsPercentF(value) {
      return { units: "Percent", value: (value || 0) * 100 };
    }
    function unitsValue(x, key) {
      if (x == null)
        return { units: "Pixels", value: 0 };
      if (typeof x !== "object")
        throw new Error(`Invalid value: ${JSON.stringify(x)} (key: ${key}) (should have value and units)`);
      const { units, value } = x;
      if (typeof value !== "number")
        throw new Error(`Invalid value in ${JSON.stringify(x)} (key: ${key})`);
      if (units !== "Pixels" && units !== "Millimeters" && units !== "Points" && units !== "None" && units !== "Picas" && units !== "Inches" && units !== "Centimeters" && units !== "Density" && units !== "Distance") {
        throw new Error(`Invalid units in ${JSON.stringify(x)} (key: ${key})`);
      }
      return { units, value };
    }
    function frac({ numerator, denominator }) {
      return { numerator, denominator };
    }
    exports.textGridding = (0, helpers_1.createEnum)("textGridding", "none", {
      none: "None",
      round: "Rnd "
    });
    exports.Ornt = (0, helpers_1.createEnum)("Ornt", "horizontal", {
      horizontal: "Hrzn",
      vertical: "Vrtc"
    });
    exports.Annt = (0, helpers_1.createEnum)("Annt", "sharp", {
      none: "Anno",
      sharp: "antiAliasSharp",
      crisp: "AnCr",
      strong: "AnSt",
      smooth: "AnSm",
      platform: "antiAliasPlatformGray",
      platformLCD: "antiAliasPlatformLCD"
    });
    exports.warpStyle = (0, helpers_1.createEnum)("warpStyle", "none", {
      none: "warpNone",
      arc: "warpArc",
      arcLower: "warpArcLower",
      arcUpper: "warpArcUpper",
      arch: "warpArch",
      bulge: "warpBulge",
      shellLower: "warpShellLower",
      shellUpper: "warpShellUpper",
      flag: "warpFlag",
      wave: "warpWave",
      fish: "warpFish",
      rise: "warpRise",
      fisheye: "warpFisheye",
      inflate: "warpInflate",
      squeeze: "warpSqueeze",
      twist: "warpTwist",
      cylinder: "warpCylinder",
      custom: "warpCustom"
    });
    exports.BlnM = (0, helpers_1.createEnum)("BlnM", "normal", {
      "normal": "Nrml",
      "dissolve": "Dslv",
      "darken": "Drkn",
      "multiply": "Mltp",
      "color burn": "CBrn",
      "linear burn": "linearBurn",
      "darker color": "darkerColor",
      "lighten": "Lghn",
      "screen": "Scrn",
      "color dodge": "CDdg",
      "linear dodge": "linearDodge",
      "lighter color": "lighterColor",
      "overlay": "Ovrl",
      "soft light": "SftL",
      "hard light": "HrdL",
      "vivid light": "vividLight",
      "linear light": "linearLight",
      "pin light": "pinLight",
      "hard mix": "hardMix",
      "difference": "Dfrn",
      "exclusion": "Xclu",
      "subtract": "blendSubtraction",
      "divide": "blendDivide",
      "hue": "H   ",
      "saturation": "Strt",
      "color": "Clr ",
      "luminosity": "Lmns",
      // used in ABR
      "linear height": "linearHeight",
      "height": "Hght",
      "subtraction": "Sbtr",
      // 2nd version of subtract ?
      "pass through": "passThrough"
      // only used in layer comps and animation frames
    });
    exports.BESl = (0, helpers_1.createEnum)("BESl", "inner bevel", {
      "inner bevel": "InrB",
      "outer bevel": "OtrB",
      "emboss": "Embs",
      "pillow emboss": "PlEb",
      "stroke emboss": "strokeEmboss"
    });
    exports.bvlT = (0, helpers_1.createEnum)("bvlT", "smooth", {
      "smooth": "SfBL",
      "chisel hard": "PrBL",
      "chisel soft": "Slmt"
    });
    exports.BESs = (0, helpers_1.createEnum)("BESs", "up", {
      up: "In  ",
      down: "Out "
    });
    exports.BETE = (0, helpers_1.createEnum)("BETE", "softer", {
      softer: "SfBL",
      precise: "PrBL"
    });
    exports.IGSr = (0, helpers_1.createEnum)("IGSr", "edge", {
      edge: "SrcE",
      center: "SrcC"
    });
    exports.GrdT = (0, helpers_1.createEnum)("GrdT", "linear", {
      linear: "Lnr ",
      radial: "Rdl ",
      angle: "Angl",
      reflected: "Rflc",
      diamond: "Dmnd"
    });
    exports.animInterpStyleEnum = (0, helpers_1.createEnum)("animInterpStyle", "linear", {
      linear: "Lnr ",
      hold: "hold"
    });
    exports.stdTrackID = (0, helpers_1.createEnum)("stdTrackID", "opacity", {
      opacity: "opacityTrack",
      style: "styleTrack",
      sheetTransform: "sheetTransformTrack",
      sheetPosition: "sheetPositionTrack",
      globalLighting: "globalLightingTrack"
    });
    exports.gradientInterpolationMethodType = (0, helpers_1.createEnum)("gradientInterpolationMethodType", "perceptual", {
      perceptual: "Perc",
      linear: "Lnr ",
      classic: "Gcls",
      smooth: "Smoo"
      // TODO: stripes
    });
    exports.Clry = (0, helpers_1.createEnum)("Clry", "user", {
      user: "UsrS",
      foreground: "FrgC",
      background: "BckC"
    });
    exports.ClrS = (0, helpers_1.createEnum)("ClrS", "rgb", {
      rgb: "RGBC",
      hsb: "HSBl",
      lab: "LbCl",
      hsl: "HSLC"
    });
    exports.FStl = (0, helpers_1.createEnum)("FStl", "outside", {
      outside: "OutF",
      center: "CtrF",
      inside: "InsF"
    });
    exports.FrFl = (0, helpers_1.createEnum)("FrFl", "color", {
      color: "SClr",
      gradient: "GrFl",
      pattern: "Ptrn"
    });
    exports.ESliceType = (0, helpers_1.createEnum)("ESliceType", "image", {
      image: "Img ",
      noImage: "noImage"
    });
    exports.ESliceHorzAlign = (0, helpers_1.createEnum)("ESliceHorzAlign", "default", {
      default: "default"
    });
    exports.ESliceVertAlign = (0, helpers_1.createEnum)("ESliceVertAlign", "default", {
      default: "default"
    });
    exports.ESliceOrigin = (0, helpers_1.createEnum)("ESliceOrigin", "userGenerated", {
      userGenerated: "userGenerated",
      autoGenerated: "autoGenerated",
      layer: "layer"
    });
    exports.ESliceBGColorType = (0, helpers_1.createEnum)("ESliceBGColorType", "none", {
      none: "None",
      matte: "matte",
      color: "Clr "
    });
    exports.strokeStyleLineCapType = (0, helpers_1.createEnum)("strokeStyleLineCapType", "butt", {
      butt: "strokeStyleButtCap",
      round: "strokeStyleRoundCap",
      square: "strokeStyleSquareCap"
    });
    exports.strokeStyleLineJoinType = (0, helpers_1.createEnum)("strokeStyleLineJoinType", "miter", {
      miter: "strokeStyleMiterJoin",
      round: "strokeStyleRoundJoin",
      bevel: "strokeStyleBevelJoin"
    });
    exports.strokeStyleLineAlignment = (0, helpers_1.createEnum)("strokeStyleLineAlignment", "inside", {
      inside: "strokeStyleAlignInside",
      center: "strokeStyleAlignCenter",
      outside: "strokeStyleAlignOutside"
    });
    exports.BlrM = (0, helpers_1.createEnum)("BlrM", "spin", {
      spin: "Spn ",
      zoom: "Zm  "
    });
    exports.BlrQ = (0, helpers_1.createEnum)("BlrQ", "good", {
      draft: "Drft",
      good: "Gd  ",
      best: "Bst "
    });
    exports.SmBM = (0, helpers_1.createEnum)("SmBM", "normal", {
      normal: "SBMN",
      "edge only": "SBME",
      "overlay edge": "SBMO"
    });
    exports.SmBQ = (0, helpers_1.createEnum)("SmBQ", "medium", {
      low: "SBQL",
      medium: "SBQM",
      high: "SBQH"
    });
    exports.DspM = (0, helpers_1.createEnum)("DspM", "stretch to fit", {
      "stretch to fit": "StrF",
      "tile": "Tile"
    });
    exports.UndA = (0, helpers_1.createEnum)("UndA", "repeat edge pixels", {
      "wrap around": "WrpA",
      "repeat edge pixels": "RptE"
    });
    exports.Cnvr = (0, helpers_1.createEnum)("Cnvr", "rectangular to polar", {
      "rectangular to polar": "RctP",
      "polar to rectangular": "PlrR"
    });
    exports.RplS = (0, helpers_1.createEnum)("RplS", "medium", {
      small: "Sml ",
      medium: "Mdm ",
      large: "Lrg "
    });
    exports.SphM = (0, helpers_1.createEnum)("SphM", "normal", {
      "normal": "Nrml",
      "horizontal only": "HrzO",
      "vertical only": "VrtO"
    });
    exports.Wvtp = (0, helpers_1.createEnum)("Wvtp", "sine", {
      sine: "WvSn",
      triangle: "WvTr",
      square: "WvSq"
    });
    exports.ZZTy = (0, helpers_1.createEnum)("ZZTy", "pond ripples", {
      "around center": "ArnC",
      "out from center": "OtFr",
      "pond ripples": "PndR"
    });
    exports.Dstr = (0, helpers_1.createEnum)("Dstr", "uniform", {
      uniform: "Unfr",
      gaussian: "Gsn "
    });
    exports.Chnl = (0, helpers_1.createEnum)("Chnl", "composite", {
      red: "Rd  ",
      green: "Grn ",
      blue: "Bl  ",
      composite: "Cmps"
    });
    exports.MztT = (0, helpers_1.createEnum)("MztT", "fine dots", {
      "fine dots": "FnDt",
      "medium dots": "MdmD",
      "grainy dots": "GrnD",
      "coarse dots": "CrsD",
      "short lines": "ShrL",
      "medium lines": "MdmL",
      "long lines": "LngL",
      "short strokes": "ShSt",
      "medium strokes": "MdmS",
      "long strokes": "LngS"
    });
    exports.Lns = (0, helpers_1.createEnum)("Lns ", "50-300mm zoom", {
      "50-300mm zoom": "Zm  ",
      "32mm prime": "Nkn ",
      "105mm prime": "Nkn1",
      "movie prime": "PnVs"
    });
    exports.blurType = (0, helpers_1.createEnum)("blurType", "gaussian blur", {
      "gaussian blur": "GsnB",
      "lens blur": "lensBlur",
      "motion blur": "MtnB"
    });
    exports.DfsM = (0, helpers_1.createEnum)("DfsM", "normal", {
      "normal": "Nrml",
      "darken only": "DrkO",
      "lighten only": "LghO",
      "anisotropic": "anisotropic"
    });
    exports.ExtT = (0, helpers_1.createEnum)("ExtT", "blocks", {
      blocks: "Blks",
      pyramids: "Pyrm"
    });
    exports.ExtR = (0, helpers_1.createEnum)("ExtR", "random", {
      random: "Rndm",
      "level-based": "LvlB"
    });
    exports.FlCl = (0, helpers_1.createEnum)("FlCl", "background color", {
      "background color": "FlBc",
      "foreground color": "FlFr",
      "inverse image": "FlIn",
      "unaltered image": "FlSm"
    });
    exports.CntE = (0, helpers_1.createEnum)("CntE", "upper", {
      lower: "Lwr ",
      upper: "Upr "
    });
    exports.WndM = (0, helpers_1.createEnum)("WndM", "wind", {
      wind: "Wnd ",
      blast: "Blst",
      stagger: "Stgr"
    });
    exports.Drct = (0, helpers_1.createEnum)("Drct", "right", {
      left: "Left",
      right: "Rght"
    });
    exports.IntE = (0, helpers_1.createEnum)("IntE", "odd lines", {
      "odd lines": "ElmO",
      "even lines": "ElmE"
    });
    exports.IntC = (0, helpers_1.createEnum)("IntC", "interpolation", {
      duplication: "CrtD",
      interpolation: "CrtI"
    });
    exports.FlMd = (0, helpers_1.createEnum)("FlMd", "wrap around", {
      "set to transparent": "Bckg",
      "repeat edge pixels": "Rpt ",
      "wrap around": "Wrp "
    });
    exports.prjM = (0, helpers_1.createEnum)("prjM", "fisheye", {
      "fisheye": "fisP",
      "perspective": "perP",
      "auto": "auto",
      "full spherical": "fusP"
    });
    exports.presetKindType = (0, helpers_1.createEnum)("presetKindType", "custom", {
      custom: "presetKindCustom",
      default: "presetKindDefault"
    });
    exports.patternColorHandling = (0, helpers_1.createEnum)("", "convert", {
      "convert": "conv",
      "avoid conversion": "avod",
      "luminance only": "lumi"
    });
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/imageResources.js
var require_imageResources = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/imageResources.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resourceHandlersMap = exports.resourceHandlers = void 0;
    exports.shouldReadResource = shouldReadResource;
    var base64_js_1 = require_base64_js();
    var additionalInfo_1 = require_additionalInfo();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var helpers_1 = require_helpers();
    var utf8_1 = require_utf8();
    var descriptor_1 = require_descriptor();
    exports.resourceHandlers = [];
    exports.resourceHandlersMap = {};
    function fieldsCheckedBy(has) {
      const fields = [];
      const target = new Proxy({}, {
        get(_, field) {
          if (typeof field === "string" && !fields.includes(field))
            fields.push(field);
          return void 0;
        }
      });
      try {
        has(target);
      } catch (_a) {
      }
      return fields;
    }
    var requiredFields = /* @__PURE__ */ new Set(["layersGroup", "layerGroupsEnabledId", "alphaChannelNames", "transparencyIndex"]);
    function addHandler(key, has, read, write, options = {}) {
      var _a, _b;
      const fields = (_a = options.fields) !== null && _a !== void 0 ? _a : fieldsCheckedBy(has);
      const required = fields.some((field) => requiredFields.has(field));
      const handler = { key, keyCount: (_b = options.keyCount) !== null && _b !== void 0 ? _b : 1, has, read, write, name: options.name, fields, required };
      exports.resourceHandlers.push(handler);
      for (let i = 0; i < handler.keyCount; i++)
        exports.resourceHandlersMap[handler.key + i] = handler;
    }
    function shouldReadResource(handler, whitelist) {
      return !whitelist || handler.required || whitelist.size > 0 && handler.fields.some((field) => whitelist.has(field));
    }
    var LOG_MOCK_HANDLERS = false;
    var RESOLUTION_UNITS = [void 0, "PPI", "PPCM"];
    var MEASUREMENT_UNITS = [void 0, "Inches", "Centimeters", "Points", "Picas", "Columns"];
    var hex = "0123456789abcdef";
    function charToNibble(code) {
      if (code <= 57)
        return code - 48;
      if (code >= 97)
        return code - 87;
      return code - 55;
    }
    function byteAt(value, index) {
      return charToNibble(value.charCodeAt(index)) << 4 | charToNibble(value.charCodeAt(index + 1));
    }
    function readUtf8String(reader, length) {
      const buffer = (0, psdReader_1.readBytes)(reader, length);
      return (0, psdReader_1.decodeUtf8)(reader, buffer);
    }
    function writeUtf8String(writer, value) {
      const buffer = (0, utf8_1.encodeString)(value);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    }
    function readEncodedString(reader) {
      const length = (0, psdReader_1.readUint8)(reader);
      const buffer = (0, psdReader_1.readBytes)(reader, length);
      return decodeEncodedString(reader, buffer);
    }
    function decodeEncodedString(reader, buffer) {
      let notAscii = false;
      for (let i = 0; i < buffer.byteLength; i++) {
        if (buffer[i] & 128) {
          notAscii = true;
          break;
        }
      }
      if (notAscii) {
        for (const decoder of [(0, psdReader_1.getGbkStrictDecoder)(reader), (0, psdReader_1.getUtf8StrictDecoder)(reader)]) {
          if (decoder) {
            try {
              return decoder.decode(buffer);
            } catch (_a) {
            }
          }
        }
      }
      return (0, psdReader_1.decodeUtf8)(reader, buffer);
    }
    function toShortAsciiString(value) {
      let ascii = "";
      for (let i = 0; i < value.length; ) {
        const code = value.codePointAt(i);
        ascii += code > 127 ? "?" : String.fromCharCode(code);
        i += code > 65535 ? 2 : 1;
      }
      return ascii.length > 255 ? ascii.substring(0, 255) : ascii;
    }
    function writeEncodedString(writer, value) {
      const buffer = (0, utf8_1.encodeString)(toShortAsciiString(value));
      (0, psdWriter_1.writeUint8)(writer, buffer.byteLength);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    }
    addHandler(
      1028,
      // IPTC-NAA record
      // IPTC-NAA record
      (target) => target.iptcData !== void 0,
      (reader, target, left) => {
        target.iptcData = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target.iptcData);
      }
    );
    addHandler(1061, (target) => target.captionDigest !== void 0, (reader, target) => {
      let captionDigest = "";
      for (let i = 0; i < 16; i++) {
        const byte = (0, psdReader_1.readUint8)(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 15];
      }
      target.captionDigest = captionDigest;
    }, (writer, target) => {
      for (let i = 0; i < 16; i++) {
        (0, psdWriter_1.writeUint8)(writer, byteAt(target.captionDigest, i * 2));
      }
    });
    addHandler(1060, (target) => target.xmpMetadata !== void 0, (reader, target, left) => {
      target.xmpMetadata = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.xmpMetadata);
    });
    var Inte = (0, helpers_1.createEnum)("Inte", "perceptual", {
      "perceptual": "Img ",
      "saturation": "Grp ",
      "relative colorimetric": "Clrm",
      "absolute colorimetric": "AClr"
    });
    addHandler(
      1085,
      // Windows DEVMODE. Variable OS specific info for Windows.
      // Windows DEVMODE. Variable OS specific info for Windows.
      (target) => target.windowsDevMode !== void 0,
      (reader, target, left) => {
        target.windowsDevMode = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target.windowsDevMode);
      }
    );
    addHandler(1082, (target) => target.printInformation !== void 0, (reader, target) => {
      var _a, _b;
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.printInformation = {
        printerName: desc.printerName || "",
        renderingIntent: Inte.decode((_a = desc.Inte) !== null && _a !== void 0 ? _a : "Inte.Img ")
      };
      const info = target.printInformation;
      if (desc.PstS !== void 0)
        info.printerManagesColors = desc.PstS;
      if (desc.ClrS === "ClrS.Grys")
        info.printerProfileColorSpace = "grayscale";
      if (desc["Nm  "] !== void 0)
        info.printerProfile = desc["Nm  "];
      if (desc.MpBl !== void 0)
        info.blackPointCompensation = desc.MpBl;
      if (desc.printSixteenBit !== void 0)
        info.printSixteenBit = desc.printSixteenBit;
      if (desc.hardProof !== void 0)
        info.hardProof = desc.hardProof;
      if (desc.printProofSetup) {
        if ("Bltn" in desc.printProofSetup) {
          info.proofSetup = { builtin: desc.printProofSetup.Bltn.split(".")[1] };
        } else {
          info.proofSetup = {
            profile: desc.printProofSetup.profile,
            renderingIntent: Inte.decode((_b = desc.printProofSetup.Inte) !== null && _b !== void 0 ? _b : "Inte.Img "),
            blackPointCompensation: !!desc.printProofSetup.MpBl,
            paperWhite: !!desc.printProofSetup.paperWhite
          };
        }
      }
    }, (writer, target) => {
      const info = target.printInformation;
      const desc = {};
      if (info.printerManagesColors) {
        desc.PstS = true;
      } else {
        if (info.hardProof !== void 0)
          desc.hardProof = !!info.hardProof;
        desc.ClrS = info.printerProfileColorSpace === "grayscale" ? "ClrS.Grys" : "ClrS.RGBC";
        if (info.printerProfile !== void 0)
          desc["Nm  "] = info.printerProfile;
      }
      desc.Inte = Inte.encode(info.renderingIntent);
      if (!info.printerManagesColors && info.blackPointCompensation !== void 0)
        desc.MpBl = !!info.blackPointCompensation;
      desc.printSixteenBit = !!info.printSixteenBit;
      desc.printerName = info.printerName || "";
      if (info.proofSetup && "profile" in info.proofSetup) {
        desc.printProofSetup = {
          profile: info.proofSetup.profile || "",
          Inte: Inte.encode(info.proofSetup.renderingIntent),
          MpBl: !!info.proofSetup.blackPointCompensation,
          paperWhite: !!info.proofSetup.paperWhite
        };
      } else if (info.proofSetup) {
        desc.printProofSetup = {
          Bltn: `builtinProof.${info.proofSetup.builtin || "proofCMYK"}`
        };
      }
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "printOutput", desc);
    });
    addHandler(
      1083,
      // Print style
      // Print style
      (target) => target.printStyle !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.printStyle = {
          caption: desc.Cptn,
          calibrationBars: desc.Clbr,
          registrationMarks: desc.RgsM,
          cornerCropMarks: desc.CrnC,
          centerCropMarks: desc.CntC,
          labels: desc.Lbls,
          negative: desc.Ngtv,
          emulsionDown: desc.EmlD,
          interpolate: desc.Intr,
          backgroundColor: (0, descriptor_1.parseColor)(desc.Bckg),
          border: (0, descriptor_1.parseUnits)(desc.BrdT),
          bleed: (0, descriptor_1.parseUnits)(desc["Bld "]),
          resolution: (0, descriptor_1.parseUnits)(desc.Rslt),
          vectorData: desc.vectorData,
          pagePosition: desc.PgPs === "PgPs.PgPC" ? "centered" : desc.PgPs,
          left: (0, descriptor_1.parseUnits)(desc.Left),
          top: (0, descriptor_1.parseUnits)(desc["Top "]),
          scale: (0, descriptor_1.parsePercent)(desc["Scl "])
        };
        if (desc.cropWhenPrinting !== void 0) {
          target.printStyle.cropWhenPrinting = desc.cropWhenPrinting;
          target.printStyle.cropRect = {
            top: desc.cropRectTop || 0,
            left: desc.cropRectLeft || 0,
            bottom: desc.cropRectBottom || 0,
            right: desc.cropRectRight || 0
          };
        }
      },
      (writer, target) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const style = target.printStyle;
        const desc = {
          Cptn: !!style.caption,
          Clbr: !!style.calibrationBars,
          RgsM: !!style.registrationMarks,
          CrnC: !!style.cornerCropMarks,
          CntC: !!style.centerCropMarks,
          Lbls: !!style.labels,
          Ngtv: !!style.negative,
          EmlD: !!style.emulsionDown,
          Intr: !!style.interpolate,
          Bckg: (0, descriptor_1.serializeColor)(style.backgroundColor || { r: 255, g: 255, b: 255 }),
          BrdT: (0, descriptor_1.unitsValue)(style.border || { units: "Distance", value: 0 }, "border"),
          "Bld ": (0, descriptor_1.unitsValue)(style.bleed || { units: "Distance", value: 0 }, "bleed"),
          Rslt: (0, descriptor_1.unitsValue)(style.resolution || { units: "Pixels", value: 72 }, "resolution"),
          vectorData: (_a = style.vectorData) !== null && _a !== void 0 ? _a : true,
          PgPs: !style.pagePosition || style.pagePosition === "centered" ? "PgPs.PgPC" : style.pagePosition,
          Left: (0, descriptor_1.unitsValue)(style.left || { units: "Distance", value: 0 }, "left"),
          "Top ": (0, descriptor_1.unitsValue)(style.top || { units: "Distance", value: 0 }, "top"),
          "Scl ": (0, descriptor_1.unitsPercentF)((_b = style.scale) !== null && _b !== void 0 ? _b : 1)
        };
        if (style.cropWhenPrinting !== void 0 || style.cropRect) {
          desc.cropWhenPrinting = !!style.cropWhenPrinting;
          desc.cropRectBottom = (_d = (_c = style.cropRect) === null || _c === void 0 ? void 0 : _c.bottom) !== null && _d !== void 0 ? _d : 0;
          desc.cropRectLeft = (_f = (_e = style.cropRect) === null || _e === void 0 ? void 0 : _e.left) !== null && _f !== void 0 ? _f : 0;
          desc.cropRectRight = (_h = (_g = style.cropRect) === null || _g === void 0 ? void 0 : _g.right) !== null && _h !== void 0 ? _h : 0;
          desc.cropRectTop = (_k = (_j = style.cropRect) === null || _j === void 0 ? void 0 : _j.top) !== null && _k !== void 0 ? _k : 0;
        }
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "printOutputOptions", desc);
      }
    );
    addHandler(1005, (target) => target.resolutionInfo !== void 0, (reader, target) => {
      const horizontalResolution = (0, psdReader_1.readFixedPoint32)(reader);
      const horizontalResolutionUnit = (0, psdReader_1.readUint16)(reader);
      const widthUnit = (0, psdReader_1.readUint16)(reader);
      const verticalResolution = (0, psdReader_1.readFixedPoint32)(reader);
      const verticalResolutionUnit = (0, psdReader_1.readUint16)(reader);
      const heightUnit = (0, psdReader_1.readUint16)(reader);
      target.resolutionInfo = {
        horizontalResolution,
        horizontalResolutionUnit: RESOLUTION_UNITS[horizontalResolutionUnit] || "PPI",
        widthUnit: MEASUREMENT_UNITS[widthUnit] || "Inches",
        verticalResolution,
        verticalResolutionUnit: RESOLUTION_UNITS[verticalResolutionUnit] || "PPI",
        heightUnit: MEASUREMENT_UNITS[heightUnit] || "Inches"
      };
    }, (writer, target) => {
      const info = target.resolutionInfo;
      (0, psdWriter_1.writeFixedPoint32)(writer, info.horizontalResolution || 0);
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
      (0, psdWriter_1.writeFixedPoint32)(writer, info.verticalResolution || 0);
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
      (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
    });
    var printScaleStyles = ["centered", "size to fit", "user defined"];
    addHandler(1062, (target) => target.printScale !== void 0, (reader, target) => {
      target.printScale = {
        style: printScaleStyles[(0, psdReader_1.readInt16)(reader)],
        x: (0, psdReader_1.readFloat32)(reader),
        y: (0, psdReader_1.readFloat32)(reader),
        scale: (0, psdReader_1.readFloat32)(reader)
      };
    }, (writer, target) => {
      const { style, x, y, scale } = target.printScale;
      (0, psdWriter_1.writeInt16)(writer, Math.max(0, printScaleStyles.indexOf(style)));
      (0, psdWriter_1.writeFloat32)(writer, x || 0);
      (0, psdWriter_1.writeFloat32)(writer, y || 0);
      (0, psdWriter_1.writeFloat32)(writer, scale || 0);
    });
    addHandler(1006, (target) => target.alphaChannelNames !== void 0, (reader, target, left) => {
      if (!target.alphaChannelNames) {
        target.alphaChannelNames = [];
        while (left() > 0) {
          const value = readEncodedString(reader);
          target.alphaChannelNames.push(value);
        }
      } else {
        (0, psdReader_1.skipBytes)(reader, left());
      }
    }, (writer, target) => {
      for (const name of target.alphaChannelNames) {
        writeEncodedString(writer, name);
      }
    });
    addHandler(1045, (target) => target.alphaChannelNames !== void 0, (reader, target, left) => {
      target.alphaChannelNames = [];
      while (left() > 0) {
        target.alphaChannelNames.push((0, psdReader_1.readUnicodeString)(reader));
      }
    }, (writer, target) => {
      for (const name of target.alphaChannelNames) {
        (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
      }
    });
    var displayInfoKinds = ["selected", "protected", "spot"];
    var supportedColorSpaces = [
      0,
      1,
      2,
      7,
      8
      /* ColorSpace.Grayscale */
    ];
    function readDisplayInfo(reader) {
      const info = { opacity: 0, kind: "selected" };
      const colorSpace = reader.view.getUint16(reader.offset);
      if (supportedColorSpaces.indexOf(colorSpace) !== -1) {
        info.color = (0, psdReader_1.readColor)(reader);
      } else {
        (0, psdReader_1.skipBytes)(reader, 2);
        info.rawColor = { colorSpace, values: [(0, psdReader_1.readUint16)(reader), (0, psdReader_1.readUint16)(reader), (0, psdReader_1.readUint16)(reader), (0, psdReader_1.readUint16)(reader)] };
      }
      info.opacity = (0, psdReader_1.readUint16)(reader) / 100;
      const kind = displayInfoKinds[(0, psdReader_1.readUint8)(reader)];
      if (!kind)
        throw new Error("Invalid display info kind");
      info.kind = kind;
      return info;
    }
    addHandler(
      1007,
      // Display info (obsolete, replaced by 1077), written back as 1077
      () => false,
      (reader, target, left) => {
        const info = [];
        while (left() >= 14) {
          info.push(readDisplayInfo(reader));
          (0, psdReader_1.skipBytes)(reader, 1);
        }
        if (!target.alphaChannelDisplayInfo)
          target.alphaChannelDisplayInfo = info;
      },
      () => {
      },
      { fields: ["alphaChannelDisplayInfo"] }
    );
    addHandler(
      1077,
      // Display info (alpha and spot channels)
      // Display info (alpha and spot channels)
      (target) => target.alphaChannelDisplayInfo !== void 0,
      (reader, target, left) => {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 1)
          throw new Error(`Invalid display info version: ${version}`);
        target.alphaChannelDisplayInfo = [];
        while (left() >= 13) {
          target.alphaChannelDisplayInfo.push(readDisplayInfo(reader));
        }
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint32)(writer, 1);
        for (const info of target.alphaChannelDisplayInfo) {
          if (!info.color && info.rawColor) {
            (0, psdWriter_1.writeUint16)(writer, info.rawColor.colorSpace);
            for (let i = 0; i < 4; i++)
              (0, psdWriter_1.writeUint16)(writer, info.rawColor.values[i] | 0);
          } else {
            (0, psdWriter_1.writeColor)(writer, info.color || { r: 255, g: 0, b: 0 });
          }
          (0, psdWriter_1.writeUint16)(writer, Math.round((0, helpers_1.clamp)(info.opacity, 0, 1) * 100));
          (0, psdWriter_1.writeUint8)(writer, Math.max(0, displayInfoKinds.indexOf(info.kind)));
        }
      }
    );
    addHandler(1053, (target) => target.alphaIdentifiers !== void 0, (reader, target, left) => {
      target.alphaIdentifiers = [];
      while (left() >= 4) {
        target.alphaIdentifiers.push((0, psdReader_1.readUint32)(reader));
      }
    }, (writer, target) => {
      for (const id of target.alphaIdentifiers) {
        (0, psdWriter_1.writeUint32)(writer, id);
      }
    });
    addHandler(1010, (target) => target.backgroundColor !== void 0, (reader, target) => target.backgroundColor = (0, psdReader_1.readColor)(reader), (writer, target) => (0, psdWriter_1.writeColor)(writer, target.backgroundColor));
    addHandler(1037, (target) => target.globalAngle !== void 0, (reader, target) => target.globalAngle = (0, psdReader_1.readInt32)(reader), (writer, target) => (0, psdWriter_1.writeInt32)(writer, target.globalAngle));
    addHandler(1049, (target) => target.globalAltitude !== void 0, (reader, target) => target.globalAltitude = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.globalAltitude));
    addHandler(1011, (target) => target.printFlags !== void 0, (reader, target, left) => {
      target.printFlags = {
        labels: !!(0, psdReader_1.readUint8)(reader),
        cropMarks: !!(0, psdReader_1.readUint8)(reader),
        colorBars: !!(0, psdReader_1.readUint8)(reader),
        registrationMarks: !!(0, psdReader_1.readUint8)(reader),
        negative: !!(0, psdReader_1.readUint8)(reader),
        flip: !!(0, psdReader_1.readUint8)(reader),
        interpolate: !!(0, psdReader_1.readUint8)(reader),
        caption: !!(0, psdReader_1.readUint8)(reader),
        printFlags: left() ? !!(0, psdReader_1.readUint8)(reader) : false
      };
    }, (writer, target) => {
      const flags = target.printFlags;
      (0, psdWriter_1.writeUint8)(writer, flags.labels ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.cropMarks ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.colorBars ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.registrationMarks ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.negative ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.flip ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.interpolate ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.caption ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, flags.printFlags ? 1 : 0);
    });
    addHandler(
      1034,
      // Copyright flag
      // Copyright flag
      (target) => target.copyrighted !== void 0,
      (reader, target) => {
        target.copyrighted = !!(0, psdReader_1.readUint8)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint8)(writer, target.copyrighted ? 1 : 0);
      }
    );
    addHandler(
      1035,
      // URL
      // URL
      (target) => target.url !== void 0,
      (reader, target, left) => {
        target.url = (0, psdReader_1.readAsciiString)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeAsciiString)(writer, target.url);
      }
    );
    addHandler(
      1e4,
      // Print flags information
      // Print flags information
      (target) => target.printFlagsInfo !== void 0,
      (reader, target) => {
        const version = (0, psdReader_1.readUint16)(reader);
        if (version !== 1)
          throw new Error(`Invalid print flags information version: ${version}`);
        const centerCropMarks = !!(0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.skipBytes)(reader, 1);
        const bleedWidth = (0, psdReader_1.readUint32)(reader);
        const bleedWidthScale = (0, psdReader_1.readUint16)(reader);
        target.printFlagsInfo = { centerCropMarks, bleedWidth, bleedWidthScale };
      },
      (writer, target) => {
        const info = target.printFlagsInfo;
        (0, psdWriter_1.writeUint16)(writer, 1);
        (0, psdWriter_1.writeUint8)(writer, info.centerCropMarks ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, info.bleedWidth | 0);
        (0, psdWriter_1.writeUint16)(writer, info.bleedWidthScale | 0);
      }
    );
    addHandler(
      1046,
      // Indexed color table count
      // Indexed color table count
      (target) => target.indexedColorCount !== void 0,
      (reader, target) => {
        target.indexedColorCount = (0, psdReader_1.readUint16)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint16)(writer, target.indexedColorCount);
      }
    );
    addHandler(
      1047,
      // Transparency index
      // Transparency index
      (target) => target.transparencyIndex !== void 0,
      (reader, target) => {
        target.transparencyIndex = (0, psdReader_1.readUint16)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint16)(writer, target.transparencyIndex);
      }
    );
    var halftoneFrequencyUnits = ["lines/inch", "lines/cm"];
    var halftoneShapes = ["round", "ellipse", "line", "square", "cross", void 0, "diamond"];
    function readHalftoneScreens(reader, left) {
      const screens = [];
      while (left() >= 18) {
        const frequency = (0, psdReader_1.readFixedPoint32)(reader);
        const frequencyUnits = halftoneFrequencyUnits[(0, psdReader_1.readUint16)(reader) - 1];
        if (!frequencyUnits)
          throw new Error("Invalid halftone screen frequency units");
        const angle = (0, psdReader_1.readFixedPoint32)(reader);
        const shape = halftoneShapes[(0, psdReader_1.readInt16)(reader)];
        if (!shape)
          throw new Error("Invalid halftone screen shape");
        (0, psdReader_1.skipBytes)(reader, 4);
        const accurateScreens = !!(0, psdReader_1.readUint8)(reader);
        const printerDefaultScreens = !!(0, psdReader_1.readUint8)(reader);
        screens.push({ frequency, frequencyUnits, angle, shape, accurateScreens, printerDefaultScreens });
      }
      return screens;
    }
    function writeHalftoneScreens(writer, screens) {
      for (const screen of screens) {
        (0, psdWriter_1.writeFixedPoint32)(writer, screen.frequency);
        (0, psdWriter_1.writeUint16)(writer, Math.max(0, halftoneFrequencyUnits.indexOf(screen.frequencyUnits)) + 1);
        (0, psdWriter_1.writeFixedPoint32)(writer, screen.angle);
        (0, psdWriter_1.writeInt16)(writer, Math.max(0, halftoneShapes.indexOf(screen.shape)));
        (0, psdWriter_1.writeZeros)(writer, 4);
        (0, psdWriter_1.writeUint8)(writer, screen.accurateScreens ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, screen.printerDefaultScreens ? 1 : 0);
      }
    }
    addHandler(
      1012,
      // Grayscale and multichannel halftoning information
      // Grayscale and multichannel halftoning information
      (target) => target.grayscaleHalftoneScreens !== void 0,
      (reader, target, left) => target.grayscaleHalftoneScreens = readHalftoneScreens(reader, left),
      (writer, target) => writeHalftoneScreens(writer, target.grayscaleHalftoneScreens)
    );
    addHandler(
      1013,
      // Color halftoning information
      // Color halftoning information
      (target) => target.colorHalftoneScreens !== void 0,
      (reader, target, left) => target.colorHalftoneScreens = readHalftoneScreens(reader, left),
      (writer, target) => writeHalftoneScreens(writer, target.colorHalftoneScreens)
    );
    function readTransferFunctions(reader, left) {
      const functions = [];
      while (left() >= 28) {
        const curve = [];
        for (let i = 0; i < 13; i++)
          curve.push((0, psdReader_1.readInt16)(reader));
        const override = !!(0, psdReader_1.readUint16)(reader);
        functions.push({ curve, override });
      }
      return functions;
    }
    function writeTransferFunctions(writer, functions) {
      var _a;
      for (const f of functions) {
        for (let i = 0; i < 13; i++)
          (0, psdWriter_1.writeInt16)(writer, (_a = f.curve[i]) !== null && _a !== void 0 ? _a : -1);
        (0, psdWriter_1.writeUint16)(writer, f.override ? 1 : 0);
      }
    }
    addHandler(
      1014,
      // Duotone halftoning information
      // Duotone halftoning information
      (target) => target.duotoneHalftoneScreens !== void 0,
      (reader, target, left) => target.duotoneHalftoneScreens = readHalftoneScreens(reader, left),
      (writer, target) => writeHalftoneScreens(writer, target.duotoneHalftoneScreens)
    );
    addHandler(
      1017,
      // Duotone transfer functions
      // Duotone transfer functions
      (target) => target.duotoneTransferFunctions !== void 0,
      (reader, target, left) => target.duotoneTransferFunctions = readTransferFunctions(reader, left),
      (writer, target) => writeTransferFunctions(writer, target.duotoneTransferFunctions)
    );
    addHandler(
      1018,
      // Duotone image information
      // Duotone image information
      (target) => target.duotoneImageInformation !== void 0,
      (reader, target, left) => target.duotoneImageInformation = (0, psdReader_1.readBytes)(reader, left()),
      (writer, target) => (0, psdWriter_1.writeBytes)(writer, target.duotoneImageInformation)
    );
    addHandler(
      1066,
      // Alternate duotone colors
      // Alternate duotone colors
      (target) => target.alternateDuotoneColors !== void 0,
      (reader, target, left) => {
        if ((0, psdReader_1.readUint16)(reader) !== 1)
          throw new Error("Invalid alternate duotone colors version");
        const colors = [];
        const count = (0, psdReader_1.readUint16)(reader);
        for (let i = 0; i < count && left() >= 10; i++)
          colors.push((0, psdReader_1.readColor)(reader));
        const labCount = (0, psdReader_1.readUint16)(reader);
        if (labCount * 3 > left())
          throw new Error("Invalid alternate duotone colors Lab table size");
        const labColors = (0, psdReader_1.readBytes)(reader, labCount * 3);
        target.alternateDuotoneColors = { colors, labColors };
      },
      (writer, target) => {
        const { colors, labColors } = target.alternateDuotoneColors;
        (0, psdWriter_1.writeUint16)(writer, 1);
        (0, psdWriter_1.writeUint16)(writer, colors.length);
        for (const color of colors)
          (0, psdWriter_1.writeColor)(writer, color);
        (0, psdWriter_1.writeUint16)(writer, Math.floor(labColors.byteLength / 3));
        (0, psdWriter_1.writeBytes)(writer, labColors.subarray(0, Math.floor(labColors.byteLength / 3) * 3));
      }
    );
    addHandler(
      1015,
      // Grayscale and multichannel transfer function
      // Grayscale and multichannel transfer function
      (target) => target.grayscaleTransferFunctions !== void 0,
      (reader, target, left) => target.grayscaleTransferFunctions = readTransferFunctions(reader, left),
      (writer, target) => writeTransferFunctions(writer, target.grayscaleTransferFunctions)
    );
    addHandler(
      1016,
      // Color transfer functions
      // Color transfer functions
      (target) => target.colorTransferFunctions !== void 0,
      (reader, target, left) => target.colorTransferFunctions = readTransferFunctions(reader, left),
      (writer, target) => writeTransferFunctions(writer, target.colorTransferFunctions)
    );
    addHandler(
      1080,
      // Count Information
      // Count Information
      (target) => target.countInformation !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.countInformation = desc.countGroupList.map((g) => ({
          color: { r: g["Rd  "], g: g["Grn "], b: g["Bl  "] },
          name: g["Nm  "],
          size: g["Rds "],
          fontSize: g.fontSize,
          visible: g.Vsbl,
          points: g.countObjectList.map((p) => ({ x: p["X   "], y: p["Y   "] }))
        }));
      },
      (writer, target) => {
        const desc = {
          Vrsn: 1,
          countGroupList: target.countInformation.map((g) => ({
            "Rd  ": g.color.r,
            "Grn ": g.color.g,
            "Bl  ": g.color.b,
            "Nm  ": g.name,
            "Rds ": g.size,
            fontSize: g.fontSize,
            Vsbl: g.visible,
            countObjectList: g.points.map((p) => ({ "X   ": p.x, "Y   ": p.y }))
          }))
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "Cnt ", desc);
      }
    );
    addHandler(1024, (target) => target.layerState !== void 0, (reader, target) => target.layerState = (0, psdReader_1.readUint16)(reader), (writer, target) => (0, psdWriter_1.writeUint16)(writer, target.layerState));
    addHandler(1026, (target) => target.layersGroup !== void 0, (reader, target, left) => {
      target.layersGroup = [];
      while (left() > 0) {
        target.layersGroup.push((0, psdReader_1.readUint16)(reader));
      }
    }, (writer, target) => {
      for (const g of target.layersGroup) {
        (0, psdWriter_1.writeUint16)(writer, g);
      }
    });
    addHandler(1072, (target) => target.layerGroupsEnabledId !== void 0, (reader, target, left) => {
      target.layerGroupsEnabledId = [];
      while (left() > 0) {
        target.layerGroupsEnabledId.push((0, psdReader_1.readUint8)(reader));
      }
    }, (writer, target) => {
      for (const id of target.layerGroupsEnabledId) {
        (0, psdWriter_1.writeUint8)(writer, id);
      }
    });
    addHandler(1069, (target) => target.layerSelectionIds !== void 0, (reader, target) => {
      let count = (0, psdReader_1.readUint16)(reader);
      target.layerSelectionIds = [];
      while (count--) {
        target.layerSelectionIds.push((0, psdReader_1.readUint32)(reader));
      }
    }, (writer, target) => {
      (0, psdWriter_1.writeUint16)(writer, target.layerSelectionIds.length);
      for (const id of target.layerSelectionIds) {
        (0, psdWriter_1.writeUint32)(writer, id);
      }
    });
    addHandler(1032, (target) => target.gridAndGuidesInformation !== void 0, (reader, target) => {
      var _a;
      const version = (0, psdReader_1.readUint32)(reader);
      const horizontal = (0, psdReader_1.readUint32)(reader);
      const vertical = (0, psdReader_1.readUint32)(reader);
      const count = (0, psdReader_1.readUint32)(reader);
      if (version !== 1)
        throw new Error(`Invalid 1032 resource version: ${version}`);
      const previous = (_a = target.gridAndGuidesInformation) === null || _a === void 0 ? void 0 : _a.guides;
      const guides = [];
      for (let i = 0; i < count; i++) {
        const guide = {
          location: (0, psdReader_1.readInt32)(reader) / 32,
          direction: (0, psdReader_1.readUint8)(reader) ? "horizontal" : "vertical"
        };
        if ((previous === null || previous === void 0 ? void 0 : previous.length) === count && previous[i].color)
          guide.color = previous[i].color;
        if ((previous === null || previous === void 0 ? void 0 : previous.length) === count && previous[i].id)
          guide.id = previous[i].id;
        guides.push(guide);
      }
      target.gridAndGuidesInformation = { grid: { horizontal, vertical }, guides };
    }, (writer, target) => {
      const info = target.gridAndGuidesInformation;
      const grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
      const guides = info.guides || [];
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, Math.round(grid.horizontal));
      (0, psdWriter_1.writeUint32)(writer, Math.round(grid.vertical));
      (0, psdWriter_1.writeUint32)(writer, guides.length);
      for (const g of guides) {
        (0, psdWriter_1.writeInt32)(writer, Math.round(g.location * 32));
        (0, psdWriter_1.writeUint8)(writer, g.direction === "horizontal" ? 1 : 0);
      }
    });
    var defaultGuideColor = { r: 74, g: 255, b: 255 };
    addHandler(
      1092,
      // Grid and guides information with guide colors (same as 1032 with color of each guide)
      // Grid and guides information with guide colors (same as 1032 with color of each guide)
      (target) => target.gridAndGuidesInformation !== void 0,
      (reader, target) => {
        var _a;
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 2)
          throw new Error(`Invalid 1092 resource version: ${version}`);
        const horizontal = (0, psdReader_1.readUint32)(reader);
        const vertical = (0, psdReader_1.readUint32)(reader);
        const count = (0, psdReader_1.readUint32)(reader);
        const guides = [];
        for (let i = 0; i < count; i++) {
          const location = (0, psdReader_1.readInt32)(reader) / 32;
          const direction = (0, psdReader_1.readUint8)(reader) ? "horizontal" : "vertical";
          (0, psdReader_1.skipBytes)(reader, 1);
          const color = { r: (0, psdReader_1.readUint8)(reader), g: (0, psdReader_1.readUint8)(reader), b: (0, psdReader_1.readUint8)(reader) };
          guides.push({ location, direction, color });
        }
        const existing = (_a = target.gridAndGuidesInformation) === null || _a === void 0 ? void 0 : _a.guides;
        if (existing && existing.length === count) {
          existing.forEach((guide, i) => guide.color = guides[i].color);
        } else {
          target.gridAndGuidesInformation = { grid: { horizontal, vertical }, guides };
        }
      },
      (writer, target) => {
        const info = target.gridAndGuidesInformation;
        const grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
        const guides = info.guides || [];
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeUint32)(writer, Math.round(grid.horizontal));
        (0, psdWriter_1.writeUint32)(writer, Math.round(grid.vertical));
        (0, psdWriter_1.writeUint32)(writer, guides.length);
        for (const g of guides) {
          const color = g.color || defaultGuideColor;
          (0, psdWriter_1.writeInt32)(writer, Math.round(g.location * 32));
          (0, psdWriter_1.writeUint8)(writer, g.direction === "horizontal" ? 1 : 0);
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeUint8)(writer, Math.round(color.r));
          (0, psdWriter_1.writeUint8)(writer, Math.round(color.g));
          (0, psdWriter_1.writeUint8)(writer, Math.round(color.b));
        }
      }
    );
    var emptyGuid = "00000000-0000-0000-0000-000000000000";
    addHandler(
      1097,
      // Guide ids
      // Guide ids
      (target) => !!target.gridAndGuidesInformation && (target.gridAndGuidesInformation.guides || []).every((g) => g.id),
      (reader, target) => {
        var _a;
        const count = (0, psdReader_1.readUint32)(reader);
        const ids = [];
        for (let i = 0; i < count; i++) {
          ids.push((0, psdReader_1.readAsciiString)(reader, (0, psdReader_1.readUint32)(reader)));
          (0, psdReader_1.readUint32)(reader);
          (0, psdReader_1.readAsciiString)(reader, (0, psdReader_1.readUint32)(reader));
        }
        const guides = (_a = target.gridAndGuidesInformation) === null || _a === void 0 ? void 0 : _a.guides;
        if (guides && guides.length === count)
          guides.forEach((guide, i) => guide.id = ids[i]);
      },
      (writer, target) => {
        const guides = target.gridAndGuidesInformation.guides || [];
        (0, psdWriter_1.writeUint32)(writer, guides.length);
        for (const g of guides) {
          (0, psdWriter_1.writeUint32)(writer, g.id.length);
          (0, psdWriter_1.writeAsciiString)(writer, g.id);
          (0, psdWriter_1.writeUint32)(writer, 0);
          (0, psdWriter_1.writeUint32)(writer, emptyGuid.length);
          (0, psdWriter_1.writeAsciiString)(writer, emptyGuid);
        }
      }
    );
    addHandler(
      1065,
      // Layer Comps
      // Layer Comps
      (target) => target.layerComps !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
        target.layerComps = { list: [] };
        for (const item of desc.list) {
          target.layerComps.list.push({
            id: item.compID,
            name: item["Nm  "],
            capturedInfo: item.capturedInfo
          });
          if (item.comment !== void 0)
            target.layerComps.list[target.layerComps.list.length - 1].comment = item.comment;
          if (item.Expn !== void 0)
            target.layerComps.list[target.layerComps.list.length - 1].expanded = item.Expn;
        }
        if (desc.lastAppliedComp !== void 0)
          target.layerComps.lastApplied = desc.lastAppliedComp;
      },
      (writer, target) => {
        const layerComps = target.layerComps;
        const desc = { list: [] };
        for (const item of layerComps.list) {
          const t = {};
          t._classID = "Comp";
          t["Nm  "] = item.name;
          if (item.comment !== void 0)
            t.comment = item.comment;
          t.compID = item.id;
          t.capturedInfo = item.capturedInfo;
          if (item.expanded !== void 0)
            t.Expn = !!item.expanded;
          desc.list.push(t);
        }
        if (layerComps.lastApplied !== void 0)
          desc.lastAppliedComp = layerComps.lastApplied;
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "CompList", desc);
      }
    );
    helpers_1.MOCK_HANDLERS && addHandler(
      1092,
      // ???
      // ???
      (target) => target._ir1092 !== void 0,
      (reader, target, left) => {
        LOG_MOCK_HANDLERS && console.log("image resource 1092", left());
        target._ir1092 = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._ir1092);
      }
    );
    var onionSkinsBlendModes = [
      "normal",
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      "multiply",
      "screen",
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      "difference"
    ];
    addHandler(
      1078,
      // Onion Skins
      // Onion Skins
      (target) => target.onionSkins !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.onionSkins = {
          enabled: desc.enab,
          framesBefore: desc.numBefore,
          framesAfter: desc.numAfter,
          frameSpacing: desc.Spcn,
          minOpacity: desc.minOpacity / 100,
          maxOpacity: desc.maxOpacity / 100,
          blendMode: onionSkinsBlendModes[desc.BlnM] || "normal"
        };
      },
      (writer, target) => {
        const onionSkins = target.onionSkins;
        const desc = {
          Vrsn: 1,
          enab: onionSkins.enabled,
          numBefore: onionSkins.framesBefore,
          numAfter: onionSkins.framesAfter,
          Spcn: onionSkins.frameSpacing,
          minOpacity: Math.round(onionSkins.minOpacity * 100),
          maxOpacity: Math.round(onionSkins.maxOpacity * 100),
          BlnM: Math.max(0, onionSkinsBlendModes.indexOf(onionSkins.blendMode))
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    addHandler(
      1075,
      // Timeline Information
      // Timeline Information
      (target) => target.timelineInformation !== void 0,
      (reader, target) => {
        var _a, _b;
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.timelineInformation = {
          enabled: desc.enab,
          frameStep: (0, descriptor_1.frac)(desc.frameStep),
          frameRate: desc.frameRate,
          time: (0, descriptor_1.frac)(desc.time),
          duration: (0, descriptor_1.frac)(desc.duration),
          workInTime: (0, descriptor_1.frac)(desc.workInTime),
          workOutTime: (0, descriptor_1.frac)(desc.workOutTime),
          repeats: desc.LCnt,
          hasMotion: desc.hasMotion,
          globalTracks: (0, descriptor_1.parseTrackList)(desc.globalTrackList, reader)
        };
        if ((_b = (_a = desc.audioClipGroupList) === null || _a === void 0 ? void 0 : _a.audioClipGroupList) === null || _b === void 0 ? void 0 : _b.length) {
          target.timelineInformation.audioClipGroups = desc.audioClipGroupList.audioClipGroupList.map((g) => ({
            id: g.groupID,
            muted: g.muted,
            audioClips: g.audioClipList.map(({ clipID, timeScope, muted, audioLevel, frameReader }) => ({
              id: clipID,
              start: (0, descriptor_1.frac)(timeScope.Strt),
              duration: (0, descriptor_1.frac)(timeScope.duration),
              inTime: (0, descriptor_1.frac)(timeScope.inTime),
              outTime: (0, descriptor_1.frac)(timeScope.outTime),
              muted,
              audioLevel,
              frameReader: {
                type: frameReader.frameReaderType,
                mediaDescriptor: frameReader.mediaDescriptor,
                link: {
                  name: frameReader["Lnk "]["Nm  "],
                  fullPath: frameReader["Lnk "].fullPath,
                  relativePath: frameReader["Lnk "].relPath
                }
              }
            }))
          }));
        }
      },
      (writer, target) => {
        var _a;
        const timeline = target.timelineInformation;
        const desc = {
          Vrsn: 1,
          enab: timeline.enabled,
          frameStep: timeline.frameStep,
          frameRate: timeline.frameRate,
          time: timeline.time,
          duration: timeline.duration,
          workInTime: timeline.workInTime,
          workOutTime: timeline.workOutTime,
          LCnt: timeline.repeats,
          globalTrackList: (0, descriptor_1.serializeTrackList)(timeline.globalTracks, writer),
          audioClipGroupList: {
            audioClipGroupList: ((_a = timeline.audioClipGroups) !== null && _a !== void 0 ? _a : []).map((a) => ({
              groupID: a.id,
              muted: a.muted,
              audioClipList: a.audioClips.map((c) => ({
                clipID: c.id,
                timeScope: {
                  Vrsn: 1,
                  Strt: c.start,
                  duration: c.duration,
                  inTime: c.inTime,
                  outTime: c.outTime
                },
                frameReader: {
                  frameReaderType: c.frameReader.type,
                  descVersion: 1,
                  "Lnk ": {
                    descVersion: 1,
                    "Nm  ": c.frameReader.link.name,
                    fullPath: c.frameReader.link.fullPath,
                    relPath: c.frameReader.link.relativePath
                  },
                  mediaDescriptor: c.frameReader.mediaDescriptor
                },
                muted: c.muted,
                audioLevel: c.audioLevel
              }))
            }))
          },
          hasMotion: timeline.hasMotion
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "anim");
      }
    );
    addHandler(
      1076,
      // Sheet Disclosure
      // Sheet Disclosure
      (target) => target.sheetDisclosure !== void 0,
      (reader, target) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.sheetDisclosure = {};
        if (desc.sheetTimelineOptions) {
          target.sheetDisclosure.sheetTimelineOptions = desc.sheetTimelineOptions.map((o) => ({
            sheetID: o.sheetID,
            sheetDisclosed: o.sheetDisclosed,
            lightsDisclosed: o.lightsDisclosed,
            meshesDisclosed: o.meshesDisclosed,
            materialsDisclosed: o.materialsDisclosed
          }));
        }
      },
      (writer, target) => {
        const disclosure = target.sheetDisclosure;
        const desc = { Vrsn: 1 };
        if (disclosure.sheetTimelineOptions) {
          desc.sheetTimelineOptions = disclosure.sheetTimelineOptions.map((d) => ({
            Vrsn: 2,
            sheetID: d.sheetID,
            sheetDisclosed: d.sheetDisclosed,
            lightsDisclosed: d.lightsDisclosed,
            meshesDisclosed: d.meshesDisclosed,
            materialsDisclosed: d.materialsDisclosed
          }));
        }
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    addHandler(
      1054,
      // URL List
      // URL List
      (target) => target.urlsList !== void 0,
      (reader, target) => {
        const count = (0, psdReader_1.readUint32)(reader);
        target.urlsList = [];
        for (let i = 0; i < count; i++) {
          const long = (0, psdReader_1.readSignature)(reader);
          if (long !== "slic" && reader.throwForMissingFeatures)
            throw new Error("Unknown long");
          const id = (0, psdReader_1.readUint32)(reader);
          const url = (0, psdReader_1.readUnicodeString)(reader);
          target.urlsList.push({ id, url, ref: "slice" });
        }
      },
      (writer, target) => {
        const list = target.urlsList;
        (0, psdWriter_1.writeUint32)(writer, list.length);
        for (let i = 0; i < list.length; i++) {
          (0, psdWriter_1.writeSignature)(writer, "slic");
          (0, psdWriter_1.writeUint32)(writer, list[i].id);
          (0, psdWriter_1.writeUnicodeString)(writer, list[i].url);
        }
      }
    );
    function boundsToBounds(bounds) {
      return { "Top ": bounds.top, Left: bounds.left, Btom: bounds.bottom, Rght: bounds.right };
    }
    function boundsFromBounds(bounds) {
      return { top: bounds["Top "], left: bounds.Left, bottom: bounds.Btom, right: bounds.Rght };
    }
    function clamped(array, index) {
      return array[Math.max(0, Math.min(array.length - 1, index))];
    }
    var sliceOrigins = ["autoGenerated", "layer", "userGenerated"];
    var sliceTypes = ["noImage", "image"];
    var sliceAlignments = ["default"];
    addHandler(
      1050,
      // Slices
      // Slices
      (target) => target.slices ? target.slices.length : 0,
      (reader, target, leftBytes) => {
        var _a;
        const version = (0, psdReader_1.readUint32)(reader);
        if (version === 6) {
          if (!target.slices)
            target.slices = [];
          const top = (0, psdReader_1.readInt32)(reader);
          const left = (0, psdReader_1.readInt32)(reader);
          const bottom = (0, psdReader_1.readInt32)(reader);
          const right = (0, psdReader_1.readInt32)(reader);
          const groupName = (0, psdReader_1.readUnicodeString)(reader);
          const count = (0, psdReader_1.readUint32)(reader);
          target.slices.push({ bounds: { top, left, bottom, right }, groupName, slices: [] });
          const slices = target.slices[target.slices.length - 1].slices;
          for (let i = 0; i < count; i++) {
            const id = (0, psdReader_1.readUint32)(reader);
            const groupId = (0, psdReader_1.readUint32)(reader);
            const origin = clamped(sliceOrigins, (0, psdReader_1.readUint32)(reader));
            const associatedLayerId = origin == "layer" ? (0, psdReader_1.readUint32)(reader) : 0;
            const name = (0, psdReader_1.readUnicodeString)(reader);
            const type = clamped(sliceTypes, (0, psdReader_1.readUint32)(reader));
            const left2 = (0, psdReader_1.readInt32)(reader);
            const top2 = (0, psdReader_1.readInt32)(reader);
            const right2 = (0, psdReader_1.readInt32)(reader);
            const bottom2 = (0, psdReader_1.readInt32)(reader);
            const url = (0, psdReader_1.readUnicodeString)(reader);
            const target2 = (0, psdReader_1.readUnicodeString)(reader);
            const message = (0, psdReader_1.readUnicodeString)(reader);
            const altTag = (0, psdReader_1.readUnicodeString)(reader);
            const cellTextIsHTML = !!(0, psdReader_1.readUint8)(reader);
            const cellText = (0, psdReader_1.readUnicodeString)(reader);
            const horizontalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const verticalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const a = (0, psdReader_1.readUint8)(reader);
            const r = (0, psdReader_1.readUint8)(reader);
            const g = (0, psdReader_1.readUint8)(reader);
            const b = (0, psdReader_1.readUint8)(reader);
            const backgroundColorType = a + r + g + b === 0 ? "none" : a === 0 ? "matte" : "color";
            slices.push({
              id,
              groupId,
              origin,
              associatedLayerId,
              name,
              target: target2,
              message,
              altTag,
              cellTextIsHTML,
              cellText,
              horizontalAlignment,
              verticalAlignment,
              type,
              url,
              bounds: { top: top2, left: left2, bottom: bottom2, right: right2 },
              backgroundColorType,
              backgroundColor: { r, g, b, a }
            });
          }
          if (leftBytes()) {
            const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
            const slicesById = /* @__PURE__ */ new Map();
            for (const s of slices) {
              if (!slicesById.has(s.id))
                slicesById.set(s.id, s);
            }
            desc.slices.forEach((d) => {
              const slice = slicesById.get(d.sliceID);
              if (slice) {
                slice.topOutset = d.topOutset;
                slice.leftOutset = d.leftOutset;
                slice.bottomOutset = d.bottomOutset;
                slice.rightOutset = d.rightOutset;
              }
            });
          }
        } else if (version === 7 || version === 8) {
          const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
          if (!target.slices)
            target.slices = [];
          target.slices.push({
            groupName: (_a = desc.baseName) !== null && _a !== void 0 ? _a : "",
            bounds: boundsFromBounds(desc.bounds),
            slices: desc.slices.map((s) => {
              var _a2;
              return Object.assign(Object.assign({}, s["Nm  "] ? { name: s["Nm  "] } : {}), { id: s.sliceID, groupId: s.groupID, associatedLayerId: (_a2 = s.associatedLayer) !== null && _a2 !== void 0 ? _a2 : 0, origin: descriptor_1.ESliceOrigin.decode(s.origin), type: descriptor_1.ESliceType.decode(s.Type), bounds: boundsFromBounds(s.bounds), url: s.url, target: s.null, message: s.Msge, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horizontalAlignment: descriptor_1.ESliceHorzAlign.decode(s.horzAlign), verticalAlignment: descriptor_1.ESliceVertAlign.decode(s.vertAlign), backgroundColorType: descriptor_1.ESliceBGColorType.decode(s.bgColorType), backgroundColor: s.bgColor ? { r: s.bgColor["Rd  "], g: s.bgColor["Grn "], b: s.bgColor["Bl  "], a: s.bgColor.alpha } : { r: 0, g: 0, b: 0, a: 0 }, topOutset: s.topOutset || 0, leftOutset: s.leftOutset || 0, bottomOutset: s.bottomOutset || 0, rightOutset: s.rightOutset || 0 });
            })
          });
        } else {
          throw new Error(`Invalid slices version (${version})`);
        }
      },
      (writer, target, index) => {
        const { bounds, groupName, slices } = target.slices[index];
        (0, psdWriter_1.writeUint32)(writer, 6);
        (0, psdWriter_1.writeInt32)(writer, bounds.top);
        (0, psdWriter_1.writeInt32)(writer, bounds.left);
        (0, psdWriter_1.writeInt32)(writer, bounds.bottom);
        (0, psdWriter_1.writeInt32)(writer, bounds.right);
        (0, psdWriter_1.writeUnicodeString)(writer, groupName);
        (0, psdWriter_1.writeUint32)(writer, slices.length);
        for (let i = 0; i < slices.length; i++) {
          const slice = slices[i];
          let { a, r, g, b } = slice.backgroundColor;
          if (slice.backgroundColorType === "none") {
            a = r = g = b = 0;
          } else if (slice.backgroundColorType === "matte") {
            a = 0;
            r = g = b = 255;
          }
          (0, psdWriter_1.writeUint32)(writer, slice.id);
          (0, psdWriter_1.writeUint32)(writer, slice.groupId);
          (0, psdWriter_1.writeUint32)(writer, sliceOrigins.indexOf(slice.origin));
          if (slice.origin === "layer")
            (0, psdWriter_1.writeUint32)(writer, slice.associatedLayerId);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.name || "");
          (0, psdWriter_1.writeUint32)(writer, sliceTypes.indexOf(slice.type));
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.left);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.top);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.right);
          (0, psdWriter_1.writeInt32)(writer, slice.bounds.bottom);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.url);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.target);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.message);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.altTag);
          (0, psdWriter_1.writeUint8)(writer, slice.cellTextIsHTML ? 1 : 0);
          (0, psdWriter_1.writeUnicodeString)(writer, slice.cellText);
          (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.horizontalAlignment));
          (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.verticalAlignment));
          (0, psdWriter_1.writeUint8)(writer, a);
          (0, psdWriter_1.writeUint8)(writer, r);
          (0, psdWriter_1.writeUint8)(writer, g);
          (0, psdWriter_1.writeUint8)(writer, b);
        }
        const desc = {
          bounds: boundsToBounds(bounds),
          slices: []
        };
        slices.forEach((s) => {
          const slice = Object.assign(Object.assign({ sliceID: s.id, groupID: s.groupId, origin: descriptor_1.ESliceOrigin.encode(s.origin), Type: descriptor_1.ESliceType.encode(s.type), bounds: boundsToBounds(s.bounds) }, s.name ? { "Nm  ": s.name } : {}), { url: s.url, null: s.target, Msge: s.message, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horzAlign: descriptor_1.ESliceHorzAlign.encode(s.horizontalAlignment), vertAlign: descriptor_1.ESliceVertAlign.encode(s.verticalAlignment), bgColorType: descriptor_1.ESliceBGColorType.encode(s.backgroundColorType) });
          if (s.backgroundColorType === "color") {
            const { r, g, b, a } = s.backgroundColor;
            slice.bgColor = { "Rd  ": r, "Grn ": g, "Bl  ": b, alpha: a };
          }
          slice.topOutset = s.topOutset || 0;
          slice.leftOutset = s.leftOutset || 0;
          slice.bottomOutset = s.bottomOutset || 0;
          slice.rightOutset = s.rightOutset || 0;
          desc.slices.push(slice);
        });
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "slices");
      }
    );
    addHandler(1064, (target) => target.pixelAspectRatio !== void 0, (reader, target) => {
      if ((0, psdReader_1.readUint32)(reader) > 2)
        throw new Error("Invalid pixelAspectRatio version");
      target.pixelAspectRatio = { aspect: (0, psdReader_1.readFloat64)(reader) };
    }, (writer, target) => {
      (0, psdWriter_1.writeUint32)(writer, 2);
      (0, psdWriter_1.writeFloat64)(writer, target.pixelAspectRatio.aspect);
    });
    addHandler(1041, (target) => target.iccUntaggedProfile !== void 0, (reader, target) => {
      target.iccUntaggedProfile = !!(0, psdReader_1.readUint8)(reader);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.iccUntaggedProfile ? 1 : 0);
    });
    addHandler(
      1039,
      // ICC Profile
      // ICC Profile
      (target) => target.iccProfile !== void 0,
      (reader, target, left) => {
        target.iccProfile = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target.iccProfile);
      }
    );
    addHandler(1044, (target) => target.idsSeedNumber !== void 0, (reader, target) => target.idsSeedNumber = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.idsSeedNumber));
    addHandler(
      1038,
      // Color samplers (Photoshop 5.0, replaced by 1073 in CS3)
      // Color samplers (Photoshop 5.0, replaced by 1073 in CS3)
      (target) => target.colorSamplers !== void 0 && !target.colorSamplers.some((s) => s.depth !== void 0),
      (reader, target, left) => {
        var _a;
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 1)
          throw new Error(`Invalid color samplers version: ${version}`);
        if ((_a = target.colorSamplers) === null || _a === void 0 ? void 0 : _a.some((s) => s.depth !== void 0))
          return (0, psdReader_1.skipBytes)(reader, left());
        const count = (0, psdReader_1.readUint32)(reader);
        target.colorSamplers = [];
        for (let i = 0; i < count && left() >= 10; i++) {
          const y = (0, psdReader_1.readInt32)(reader) / 16;
          const x = (0, psdReader_1.readInt32)(reader) / 16;
          const colorSpace = (0, psdReader_1.readInt16)(reader);
          target.colorSamplers.push({ x, y, colorSpace });
        }
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint32)(writer, 1);
        (0, psdWriter_1.writeUint32)(writer, target.colorSamplers.length);
        for (const sampler of target.colorSamplers) {
          (0, psdWriter_1.writeInt32)(writer, Math.round(sampler.y * 16));
          (0, psdWriter_1.writeInt32)(writer, Math.round(sampler.x * 16));
          (0, psdWriter_1.writeInt16)(writer, sampler.colorSpace);
        }
      }
    );
    addHandler(
      1073,
      // Color samplers (Photoshop CS3)
      // Color samplers (Photoshop CS3)
      (target) => target.colorSamplers !== void 0 && target.colorSamplers.some((s) => s.depth !== void 0),
      (reader, target, left) => {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version < 1 || version > 3)
          throw new Error(`Invalid color samplers version: ${version}`);
        const count = (0, psdReader_1.readUint32)(reader);
        target.colorSamplers = [];
        for (let i = 0; i < count && left() >= 10; i++) {
          const samplerVersion = version === 3 ? (0, psdReader_1.readUint32)(reader) : version;
          const y = samplerVersion === 1 ? (0, psdReader_1.readInt32)(reader) / 16 : (0, psdReader_1.readFloat32)(reader);
          const x = samplerVersion === 1 ? (0, psdReader_1.readInt32)(reader) / 16 : (0, psdReader_1.readFloat32)(reader);
          const colorSpace = (0, psdReader_1.readInt16)(reader);
          const depth = version >= 2 ? (0, psdReader_1.readInt16)(reader) : 1;
          target.colorSamplers.push({ x, y, colorSpace, depth });
        }
      },
      (writer, target) => {
        var _a;
        (0, psdWriter_1.writeUint32)(writer, 3);
        (0, psdWriter_1.writeUint32)(writer, target.colorSamplers.length);
        for (const sampler of target.colorSamplers) {
          (0, psdWriter_1.writeUint32)(writer, 1);
          (0, psdWriter_1.writeInt32)(writer, Math.round(sampler.y * 16));
          (0, psdWriter_1.writeInt32)(writer, Math.round(sampler.x * 16));
          (0, psdWriter_1.writeInt16)(writer, sampler.colorSpace);
          (0, psdWriter_1.writeInt16)(writer, (_a = sampler.depth) !== null && _a !== void 0 ? _a : 1);
        }
      }
    );
    addHandler(
      1022,
      // Quick Mask information
      // Quick Mask information
      (target) => target.quickMaskInfo !== void 0,
      (reader, target) => {
        const channelId = (0, psdReader_1.readUint16)(reader);
        const initiallyEmpty = !!(0, psdReader_1.readUint8)(reader);
        target.quickMaskInfo = { channelId, initiallyEmpty };
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint16)(writer, target.quickMaskInfo.channelId);
        (0, psdWriter_1.writeUint8)(writer, target.quickMaskInfo.initiallyEmpty ? 1 : 0);
      }
    );
    addHandler(
      1074,
      // Measurement scale
      // Measurement scale
      (target) => target.measurementScale !== void 0,
      (reader, target, left) => {
        target.measurementScale = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target.measurementScale);
      }
    );
    addHandler(
      1042,
      // Effects visible (only present when effects are hidden)
      // Effects visible (only present when effects are hidden)
      (target) => target.effectsVisible !== void 0,
      (reader, target) => {
        target.effectsVisible = !!(0, psdReader_1.readUint8)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint8)(writer, target.effectsVisible ? 1 : 0);
      }
    );
    addHandler(1036, (target) => target.thumbnail !== void 0 || target.thumbnailRaw !== void 0, (reader, target, left) => {
      const format = (0, psdReader_1.readUint32)(reader);
      const width = (0, psdReader_1.readUint32)(reader);
      const height = (0, psdReader_1.readUint32)(reader);
      const widthBytes = (0, psdReader_1.readUint32)(reader);
      (0, psdReader_1.readUint32)(reader);
      (0, psdReader_1.readUint32)(reader);
      const bitsPerPixel = (0, psdReader_1.readUint16)(reader);
      (0, psdReader_1.readUint16)(reader);
      if (format === 0 && bitsPerPixel === 24 && widthBytes >= width * 3 && widthBytes * height <= left()) {
        if (reader.useRawThumbnail) {
          reader.logMissingFeatures && reader.log("Raw thumbnail data is not supported with useRawThumbnail option");
          (0, psdReader_1.skipBytes)(reader, left());
          return;
        }
        const data2 = (0, psdReader_1.readBytes)(reader, widthBytes * height);
        const imageData = (0, helpers_1.createImageData)(width, height);
        for (let y = 0, dst = 0; y < height; y++) {
          for (let x = 0, src = y * widthBytes; x < width; x++, src += 3, dst += 4) {
            imageData.data[dst + 0] = data2[src + 0];
            imageData.data[dst + 1] = data2[src + 1];
            imageData.data[dst + 2] = data2[src + 2];
            imageData.data[dst + 3] = 255;
          }
        }
        target.thumbnail = (0, helpers_1.imageDataToCanvas)(imageData);
        (0, psdReader_1.skipBytes)(reader, left());
        return;
      }
      if (format !== 1 || bitsPerPixel !== 24) {
        reader.logMissingFeatures && reader.log(`Invalid thumbnail data (format: ${format}, bitsPerPixel: ${bitsPerPixel})`);
        (0, psdReader_1.skipBytes)(reader, left());
        return;
      }
      const size = left();
      const data = (0, psdReader_1.readBytes)(reader, size);
      if (reader.useRawThumbnail) {
        target.thumbnailRaw = { width, height, data };
      } else if (data.byteLength) {
        target.thumbnail = (0, helpers_1.createCanvasFromData)(data, reader);
      }
    }, (writer, target) => {
      var _a;
      let width = 0;
      let height = 0;
      let data = new Uint8Array(0);
      if (target.thumbnailRaw) {
        width = target.thumbnailRaw.width;
        height = target.thumbnailRaw.height;
        data = target.thumbnailRaw.data;
      } else {
        try {
          const dataUrl = (_a = target.thumbnail.toDataURL("image/jpeg", 1)) === null || _a === void 0 ? void 0 : _a.substring("data:image/jpeg;base64,".length);
          if (dataUrl) {
            data = (0, base64_js_1.toByteArray)(dataUrl);
            width = target.thumbnail.width;
            height = target.thumbnail.height;
          }
        } catch (_b) {
        }
      }
      const bitsPerPixel = 24;
      const widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
      const planes = 1;
      const totalSize = widthBytes * height * planes;
      const sizeAfterCompression = data.length;
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, width);
      (0, psdWriter_1.writeUint32)(writer, height);
      (0, psdWriter_1.writeUint32)(writer, widthBytes);
      (0, psdWriter_1.writeUint32)(writer, totalSize);
      (0, psdWriter_1.writeUint32)(writer, sizeAfterCompression);
      (0, psdWriter_1.writeUint16)(writer, bitsPerPixel);
      (0, psdWriter_1.writeUint16)(writer, planes);
      (0, psdWriter_1.writeBytes)(writer, data);
    });
    addHandler(1057, (target) => target.versionInfo !== void 0, (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 1)
        throw new Error("Invalid versionInfo version");
      target.versionInfo = {
        hasRealMergedData: !!(0, psdReader_1.readUint8)(reader),
        writerName: (0, psdReader_1.readUnicodeString)(reader),
        readerName: (0, psdReader_1.readUnicodeString)(reader),
        fileVersion: (0, psdReader_1.readUint32)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const versionInfo = target.versionInfo;
      (0, psdWriter_1.writeUint32)(writer, 1);
      (0, psdWriter_1.writeUint8)(writer, versionInfo.hasRealMergedData ? 1 : 0);
      (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.writerName);
      (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.readerName);
      (0, psdWriter_1.writeUint32)(writer, versionInfo.fileVersion);
    });
    addHandler(
      1058,
      // EXIF data 1
      // EXIF data 1
      (target) => target.exifData !== void 0,
      (reader, target, left) => {
        target.exifData = (0, psdReader_1.readBytes)(reader, left());
      },
      (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target.exifData);
      }
    );
    addHandler(7e3, (target) => target.imageReadyVariables !== void 0, (reader, target, left) => {
      target.imageReadyVariables = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.imageReadyVariables);
    });
    addHandler(7001, (target) => target.imageReadyDataSets !== void 0, (reader, target, left) => {
      target.imageReadyDataSets = readUtf8String(reader, left());
    }, (writer, target) => {
      writeUtf8String(writer, target.imageReadyDataSets);
    });
    addHandler(1088, (target) => target.pathSelectionState !== void 0, (reader, target, _left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.pathSelectionState = desc["null"];
    }, (writer, target) => {
      const desc = { "null": (0, descriptor_1.pathSelectionStateToReference)(target.pathSelectionState) };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler(
      1025,
      // Work path
      // Work path
      (target) => target.workPath !== void 0,
      (reader, target, left, { width, height }) => {
        target.workPath = { paths: [] };
        (0, additionalInfo_1.readVectorMask)(reader, target.workPath, width, height, left());
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target, _index, { width, height }) => {
        (0, additionalInfo_1.writeVectorMask)(writer, target.workPath, width, height);
      }
    );
    var MAX_SAVED_PATHS = 999;
    addHandler(
      2e3,
      // Saved paths (one resource for each path, named after the path)
      // Saved paths (one resource for each path, named after the path)
      (target) => target.savedPaths ? Math.min(target.savedPaths.length, MAX_SAVED_PATHS) : 0,
      (reader, target, left, { signature, id, name, width, height }) => {
        var _a, _b;
        if (signature !== "8BIM") {
          reader.logMissingFeatures && reader.log(`Unhandled image resource: ${signature} ${id}`);
          (0, psdReader_1.skipBytes)(reader, left());
          return;
        }
        const savedPaths = (_a = target.savedPaths) !== null && _a !== void 0 ? _a : target.savedPaths = [];
        const path = { name: decodeEncodedString(reader, name), paths: [] };
        (0, additionalInfo_1.readVectorMask)(reader, path, width, height, left());
        (0, psdReader_1.skipBytes)(reader, left());
        const keyDescriptorList = (_b = target.savedPathsOrigination) === null || _b === void 0 ? void 0 : _b[savedPaths.length];
        if (keyDescriptorList)
          path.vectorOrigination = { keyDescriptorList };
        savedPaths.push(path);
      },
      (writer, target, index, { width, height }) => {
        (0, additionalInfo_1.writeVectorMask)(writer, target.savedPaths[index], width, height);
      },
      { keyCount: MAX_SAVED_PATHS, name: (target, index) => toShortAsciiString(target.savedPaths[index].name) }
    );
    addHandler(
      3e3,
      // Origin path info (origination data of saved paths)
      // Origin path info (origination data of saved paths)
      (target) => {
        var _a;
        return !!((_a = target.savedPaths) === null || _a === void 0 ? void 0 : _a.some((path) => path.vectorOrigination));
      },
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        desc.keyRootDescriptorList.forEach((item, i) => {
          var _a, _b;
          const keyDescriptorList = (0, additionalInfo_1.parseKeyDescriptorList)(item);
          if (!keyDescriptorList.length)
            return;
          const path = (_a = target.savedPaths) === null || _a === void 0 ? void 0 : _a[i];
          if (path) {
            path.vectorOrigination = { keyDescriptorList };
          } else {
            ((_b = target.savedPathsOrigination) !== null && _b !== void 0 ? _b : target.savedPathsOrigination = [])[i] = keyDescriptorList;
          }
        });
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        const desc = {
          keyRootDescriptorList: target.savedPaths.slice(0, MAX_SAVED_PATHS).map((path) => {
            var _a, _b;
            return (0, additionalInfo_1.serializeKeyDescriptorList)((_b = (_a = path.vectorOrigination) === null || _a === void 0 ? void 0 : _a.keyDescriptorList) !== null && _b !== void 0 ? _b : []);
          })
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      },
      { name: () => "OriginDataIRB" }
    );
    addHandler(
      2999,
      // Clipping path
      // Clipping path
      (target) => target.clippingPath !== void 0,
      (reader, target, left) => {
        const name = readEncodedString(reader);
        const flatness = (0, psdReader_1.readFixedPoint32)(reader);
        (0, psdReader_1.skipBytes)(reader, left());
        target.clippingPath = { name, flatness };
      },
      (writer, target) => {
        writeEncodedString(writer, target.clippingPath.name);
        (0, psdWriter_1.writeFixedPoint32)(writer, target.clippingPath.flatness);
        (0, psdWriter_1.writeUint16)(writer, 1);
      }
    );
    var FrmD = (0, helpers_1.createEnum)("FrmD", "auto", {
      auto: "Auto",
      none: "None",
      dispose: "Disp"
    });
    function pluginResourceKeys(target) {
      const keys = [];
      if (target.outputSettings !== void 0)
        keys.push("mset");
      if (target.animations !== void 0)
        keys.push("mani", "mfri");
      return keys;
    }
    addHandler(
      4e3,
      // Plug-In resource(s), identified by key stored in the data (ids 4000-4999)
      // Plug-In resource(s), identified by key stored in the data (ids 4000-4999)
      (target) => pluginResourceKeys(target).length,
      (reader, target, left) => {
        const key = (0, psdReader_1.readSignature)(reader);
        if (key === "mset") {
          target.outputSettings = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
          (0, psdReader_1.skipBytes)(reader, left());
        } else if (key === "mfri") {
          (0, psdReader_1.skipBytes)(reader, left());
        } else if (key === "mani") {
          (0, psdReader_1.checkSignature)(reader, "IRFR");
          (0, psdReader_1.readSection)(reader, 1, (left2) => {
            while (left2() > 0) {
              (0, psdReader_1.checkSignature)(reader, "8BIM");
              const key2 = (0, psdReader_1.readSignature)(reader);
              (0, psdReader_1.readSection)(reader, 1, (left3) => {
                if (key2 === "AnDs") {
                  const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                  target.animations = {
                    frames: desc.FrIn.map((x) => {
                      const frame = {
                        id: x.FrID,
                        delay: (x.FrDl || 0) / 100,
                        dispose: x.FrDs ? FrmD.decode(x.FrDs) : "auto"
                        // missing == auto
                      };
                      if (x.FrGA !== void 0)
                        frame.globalAngle = x.FrGA;
                      if (x.FrGL !== void 0)
                        frame.globalAltitude = x.FrGL;
                      return frame;
                    }),
                    animations: desc.FSts.map((x) => ({
                      id: x.FsID,
                      frames: x.FsFr,
                      repeats: x.LCnt,
                      activeFrame: x.AFrm || 0
                    }))
                  };
                  if (desc.AFSt !== void 0)
                    target.animations.activeAnimation = desc.AFSt;
                  (0, psdReader_1.skipBytes)(reader, left3());
                } else if (key2 === "Roll") {
                  const bytes = (0, psdReader_1.readBytes)(reader, left3());
                  reader.logDevFeatures && reader.log("#4000 Roll", bytes);
                } else {
                  reader.logMissingFeatures && reader.log("Unhandled subsection in #4000", key2);
                  (0, psdReader_1.skipBytes)(reader, left3());
                }
              });
            }
          });
          (0, psdReader_1.skipBytes)(reader, left());
        } else if (key === "mopt") {
          const bytes = (0, psdReader_1.readBytes)(reader, left());
          reader.logDevFeatures && reader.log("#4000 mopt", bytes);
        } else {
          reader.logMissingFeatures && reader.log(`Unhandled plug-in resource key: ${key}`);
          (0, psdReader_1.skipBytes)(reader, left());
        }
      },
      (writer, target, index) => {
        var _a, _b;
        const key = pluginResourceKeys(target)[index];
        if (key === "mset") {
          (0, psdWriter_1.writeSignature)(writer, "mset");
          (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", target.outputSettings, descriptor_1.outputSettingsRoot);
        } else if (key === "mfri") {
          const animations = target.animations;
          (0, psdWriter_1.writeSignature)(writer, "mfri");
          (0, psdWriter_1.writeUint32)(writer, 2);
          (0, psdWriter_1.writeUint32)(writer, 16);
          (0, psdWriter_1.writeUint32)(writer, animations.frames.length);
          (0, psdWriter_1.writeUint32)(writer, (_b = (_a = animations.animations[0]) === null || _a === void 0 ? void 0 : _a.activeFrame) !== null && _b !== void 0 ? _b : 0);
          (0, psdWriter_1.writeUint32)(writer, animations.animations.length);
          (0, psdWriter_1.writeUint32)(writer, 0);
        } else if (key === "mani") {
          (0, psdWriter_1.writeSignature)(writer, "mani");
          (0, psdWriter_1.writeSignature)(writer, "IRFR");
          (0, psdWriter_1.writeSection)(writer, 1, () => {
            (0, psdWriter_1.writeSignature)(writer, "8BIM");
            (0, psdWriter_1.writeSignature)(writer, "AnDs");
            (0, psdWriter_1.writeSection)(writer, 1, () => {
              const desc = Object.assign(Object.assign({}, target.animations.activeAnimation !== void 0 ? { AFSt: target.animations.activeAnimation } : {}), { FrIn: [], FSts: [] });
              for (let i = 0; i < target.animations.frames.length; i++) {
                const f = target.animations.frames[i];
                const frame = {
                  FrID: f.id
                };
                if (f.delay)
                  frame.FrDl = Math.round(f.delay * 100);
                frame.FrDs = FrmD.encode(f.dispose);
                if (f.globalAngle !== void 0)
                  frame.FrGA = f.globalAngle;
                if (f.globalAltitude !== void 0)
                  frame.FrGL = f.globalAltitude;
                desc.FrIn.push(frame);
              }
              for (let i = 0; i < target.animations.animations.length; i++) {
                const a = target.animations.animations[i];
                const anim = {
                  FsID: a.id,
                  AFrm: a.activeFrame | 0,
                  FsFr: a.frames,
                  LCnt: a.repeats | 0
                };
                desc.FSts.push(anim);
              }
              (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
            });
            (0, psdWriter_1.writeSignature)(writer, "8BIM");
            (0, psdWriter_1.writeSignature)(writer, "Roll");
            (0, psdWriter_1.writeSection)(writer, 1, () => {
              (0, psdWriter_1.writeZeros)(writer, 8);
            });
          });
        }
      },
      { keyCount: 1e3 }
    );
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/psdReader.js
var require_psdReader = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/psdReader.js"(exports) {
    "use strict";
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.supportedColorModes = void 0;
    exports.getUtf8Decoder = getUtf8Decoder;
    exports.getUtf8StrictDecoder = getUtf8StrictDecoder;
    exports.getGbkStrictDecoder = getGbkStrictDecoder;
    exports.decodeUtf8 = decodeUtf8;
    exports.createReader = createReader;
    exports.warnOrThrow = warnOrThrow;
    exports.readUint8 = readUint8;
    exports.peekUint8 = peekUint8;
    exports.readInt16 = readInt16;
    exports.readUint16 = readUint16;
    exports.readUint16LE = readUint16LE;
    exports.readInt32 = readInt32;
    exports.readInt32LE = readInt32LE;
    exports.readUint32 = readUint32;
    exports.readFloat32 = readFloat32;
    exports.readFloat64 = readFloat64;
    exports.readFixedPoint32 = readFixedPoint32;
    exports.readFixedPointPath32 = readFixedPointPath32;
    exports.readBytes = readBytes;
    exports.readSignature = readSignature;
    exports.validSignatureAt = validSignatureAt;
    exports.readPascalString = readPascalString;
    exports.readUnicodeString = readUnicodeString;
    exports.readUnicodeStringWithLength = readUnicodeStringWithLength;
    exports.readUnicodeStringWithLengthLE = readUnicodeStringWithLengthLE;
    exports.readAsciiString = readAsciiString;
    exports.skipBytes = skipBytes;
    exports.checkSignature = checkSignature;
    exports.readPsd = readPsd;
    exports.readLayerInfo = readLayerInfo;
    exports.getCompositeImageData = getCompositeImageData;
    exports.getCompositeCanvas = getCompositeCanvas;
    exports.getLayerImageData = getLayerImageData;
    exports.getLayerMaskImageData = getLayerMaskImageData;
    exports.getLayerRealMaskImageData = getLayerRealMaskImageData;
    exports.getLayerCanvas = getLayerCanvas;
    exports.getLayerMaskCanvas = getLayerMaskCanvas;
    exports.getLayerRealMaskCanvas = getLayerRealMaskCanvas;
    exports.getFilterEffectsMaskImageData = getFilterEffectsMaskImageData;
    exports.getFilterEffectsMaskExtraImageData = getFilterEffectsMaskExtraImageData;
    exports.getFilterEffectsMaskCanvas = getFilterEffectsMaskCanvas;
    exports.getFilterEffectsMaskExtraCanvas = getFilterEffectsMaskExtraCanvas;
    exports.decodeLayerPixels = decodeLayerPixels;
    exports.readGlobalLayerMaskInfo = readGlobalLayerMaskInfo;
    exports.readAdditionalLayerInfo = readAdditionalLayerInfo;
    exports.readDataZip = readDataZip;
    exports.readDataRLE = readDataRLE;
    exports.readSection = readSection;
    exports.readColor = readColor;
    exports.readPatternSafe = readPatternSafe;
    exports.readPattern = readPattern;
    exports.consumeMemory = consumeMemory;
    var pako_1 = require_pako();
    var helpers_1 = require_helpers();
    var additionalInfo_1 = require_additionalInfo();
    var utf8_1 = require_utf8();
    var imageResources_1 = require_imageResources();
    exports.supportedColorModes = [
      0,
      1,
      3,
      2,
      4
      /* ColorMode.CMYK */
    ];
    var colorModes = ["bitmap", "grayscale", "indexed", "RGB", "CMYK", "", "", "multichannel", "duotone", "lab"];
    function setupGrayscale(data) {
      const size = data.width * data.height * 4;
      for (let i = 0; i < size; i += 4) {
        const c = data.data[i];
        data.data[i + 1] = c;
        data.data[i + 2] = c;
      }
    }
    function createTextDecoder(label, options) {
      try {
        return typeof TextDecoder !== "undefined" ? new TextDecoder(label, options) : null;
      } catch (_a) {
        return null;
      }
    }
    function getUtf8Decoder(reader) {
      if (reader.utf8Decoder === void 0)
        reader.utf8Decoder = createTextDecoder("utf-8", { ignoreBOM: true });
      return reader.utf8Decoder;
    }
    function getUtf8StrictDecoder(reader) {
      if (reader.utf8StrictDecoder === void 0)
        reader.utf8StrictDecoder = createTextDecoder("utf-8", { ignoreBOM: true, fatal: true });
      return reader.utf8StrictDecoder;
    }
    function getGbkStrictDecoder(reader) {
      if (reader.gbkDecoder === void 0)
        reader.gbkDecoder = createTextDecoder("gbk", { fatal: true });
      return reader.gbkDecoder;
    }
    function decodeUtf8(reader, buffer) {
      const decoder = buffer.byteLength > 1e3 ? getUtf8Decoder(reader) : null;
      return decoder ? decoder.decode(buffer) : (0, utf8_1.decodeString)(buffer);
    }
    function createReader(buffer, offset, length) {
      const view = new DataView(buffer, offset, length);
      return { view, offset: 0, strict: false, debug: false, large: false, globalAlpha: false, log: console.log };
    }
    function warnOrThrow(reader, message) {
      if (reader.strict)
        throw new Error(message);
      if (reader.debug)
        reader.log(message);
    }
    function readUint8(reader) {
      reader.offset += 1;
      return reader.view.getUint8(reader.offset - 1);
    }
    function peekUint8(reader) {
      return reader.view.getUint8(reader.offset);
    }
    function readInt16(reader) {
      reader.offset += 2;
      return reader.view.getInt16(reader.offset - 2, false);
    }
    function readUint16(reader) {
      reader.offset += 2;
      return reader.view.getUint16(reader.offset - 2, false);
    }
    function readUint16LE(reader) {
      reader.offset += 2;
      return reader.view.getUint16(reader.offset - 2, true);
    }
    function readInt32(reader) {
      reader.offset += 4;
      return reader.view.getInt32(reader.offset - 4, false);
    }
    function readInt32LE(reader) {
      reader.offset += 4;
      return reader.view.getInt32(reader.offset - 4, true);
    }
    function readUint32(reader) {
      reader.offset += 4;
      return reader.view.getUint32(reader.offset - 4, false);
    }
    function readFloat32(reader) {
      reader.offset += 4;
      return reader.view.getFloat32(reader.offset - 4, false);
    }
    function readFloat64(reader) {
      reader.offset += 8;
      return reader.view.getFloat64(reader.offset - 8, false);
    }
    function readFixedPoint32(reader) {
      return readInt32(reader) / (1 << 16);
    }
    function readFixedPointPath32(reader) {
      return readInt32(reader) / (1 << 24);
    }
    function readBytes(reader, length) {
      if (!(length >= 0))
        throw new Error(`Invalid length: ${length}`);
      const start = reader.offset;
      const viewLength = reader.view.byteLength;
      reader.offset += length;
      if (start + length > viewLength) {
        warnOrThrow(reader, "Reading bytes exceeding buffer length");
        if (length > 100 * 1024 * 1024)
          throw new Error("Reading past end of file");
        consumeMemory(reader, length);
        const result = new Uint8Array(length);
        const len = Math.min(length, viewLength - start);
        if (len > 0)
          result.set(new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, len));
        return result;
      } else {
        return new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, length);
      }
    }
    function readSignature(reader) {
      return readShortString(reader, 4);
    }
    function validSignatureAt(reader, offset) {
      const sig = String.fromCharCode(reader.view.getUint8(offset)) + String.fromCharCode(reader.view.getUint8(offset + 1)) + String.fromCharCode(reader.view.getUint8(offset + 2)) + String.fromCharCode(reader.view.getUint8(offset + 3));
      return sig == "8BIM" || sig == "8B64";
    }
    function readPascalString(reader, padTo) {
      let length = readUint8(reader);
      const text = length ? readShortString(reader, length) : "";
      while (++length % padTo) {
        reader.offset++;
      }
      return text;
    }
    function readUnicodeString(reader) {
      const length = readUint32(reader);
      return readUnicodeStringWithLength(reader, length);
    }
    var STRING_CHUNK_SIZE = 8192;
    var SHORT_STRING_LENGTH = 64;
    function checkReadBounds(reader, size) {
      if (reader.offset < 0 || reader.offset + size > reader.view.byteLength) {
        throw new RangeError("Offset is outside the bounds of the DataView");
      }
    }
    function readUtf16String(reader, length, littleEndian) {
      if (!(length > 0))
        return "";
      checkReadBounds(reader, length * 2);
      const view = reader.view;
      let offset = reader.offset;
      let text = "";
      if (length <= SHORT_STRING_LENGTH) {
        for (let i = 0; i < length; i++, offset += 2) {
          text += String.fromCharCode(view.getUint16(offset, littleEndian));
        }
        reader.offset = offset;
        if (text.charCodeAt(text.length - 1) === 0)
          text = text.substring(0, text.length - 1);
        return text;
      }
      const codes = new Uint16Array(Math.min(length, STRING_CHUNK_SIZE));
      for (let i = 0; i < length; i += STRING_CHUNK_SIZE) {
        const count = Math.min(STRING_CHUNK_SIZE, length - i);
        for (let j = 0; j < count; j++, offset += 2) {
          codes[j] = view.getUint16(offset, littleEndian);
        }
        text += String.fromCharCode.apply(null, count === codes.length ? codes : codes.subarray(0, count));
      }
      reader.offset = offset;
      if (text.charCodeAt(text.length - 1) === 0)
        text = text.substring(0, text.length - 1);
      return text;
    }
    function bytesToString(bytes) {
      let text = "";
      for (let i = 0; i < bytes.length; i += STRING_CHUNK_SIZE) {
        text += String.fromCharCode.apply(null, bytes.subarray(i, i + STRING_CHUNK_SIZE));
      }
      return text;
    }
    function readUnicodeStringWithLength(reader, length) {
      return readUtf16String(reader, length, false);
    }
    function readUnicodeStringWithLengthLE(reader, length) {
      return readUtf16String(reader, length, true);
    }
    function readAsciiString(reader, length) {
      if (!(length > 0))
        return "";
      checkReadBounds(reader, length);
      if (length <= SHORT_STRING_LENGTH) {
        const view = reader.view;
        let text2 = "";
        for (let i = 0, offset = reader.offset; i < length; i++, offset++) {
          text2 += String.fromCharCode(view.getUint8(offset));
        }
        reader.offset += length;
        return text2;
      }
      const text = bytesToString(new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, length));
      reader.offset += length;
      return text;
    }
    function skipBytes(reader, count) {
      reader.offset += count;
    }
    function checkSignature(reader, a, b) {
      const offset = reader.offset;
      const signature = readSignature(reader);
      if (signature !== a && signature !== b) {
        throw new Error(`Invalid signature: '${signature}' at 0x${offset.toString(16)}`);
      }
    }
    function readShortString(reader, length) {
      const bytes = readBytes(reader, length);
      if (length > SHORT_STRING_LENGTH)
        return bytesToString(bytes);
      let text = "";
      for (let i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
      }
      return text;
    }
    function isValidSignature(sig) {
      return sig === "8BIM" || sig === "MeSa" || sig === "AgHg" || sig === "PHUT" || sig === "DCSR";
    }
    function readPsd(reader, readOptions = {}) {
      var _a;
      checkSignature(reader, "8BPS");
      const version = readUint16(reader);
      if (version !== 1 && version !== 2)
        throw new Error(`Invalid PSD file version: ${version}`);
      skipBytes(reader, 6);
      const channels = readUint16(reader);
      const height = readUint32(reader);
      const width = readUint32(reader);
      const bitsPerChannel = readUint16(reader);
      const colorMode = readUint16(reader);
      const maxSize = version === 1 ? 3e4 : 3e5;
      if (width > maxSize || height > maxSize)
        throw new Error(`Invalid size: ${width}x${height}`);
      if (channels < 1 || channels > 57)
        throw new Error(`Invalid channel count: ${channels}`);
      if (![1, 8, 16, 32].includes(bitsPerChannel))
        throw new Error(`Invalid bitsPerChannel: ${bitsPerChannel}`);
      if (exports.supportedColorModes.indexOf(colorMode) === -1)
        throw new Error(`Color mode not supported: ${(_a = colorModes[colorMode]) !== null && _a !== void 0 ? _a : colorMode}`);
      const psd = { width, height, channels, bitsPerChannel, colorMode };
      Object.assign(reader, readOptions);
      reader.large = version === 2;
      reader.globalAlpha = false;
      reader.layersInGlobalInfo = false;
      const whitelist = reader.imageResourcesWhitelist;
      reader.imageResourcesWhitelistSet = whitelist ? whitelist instanceof Set ? whitelist : new Set(whitelist) : void 0;
      if (!("totalMemoryLimit" in reader)) {
        reader.totalMemoryLimit = 2 * 1024 * 1024 * 1024;
      }
      readSection(reader, 1, (left) => {
        if (!left())
          return;
        if (colorMode === 2) {
          if (left() != 768)
            throw new Error("Invalid color palette size");
          psd.palette = [];
          for (let i = 0; i < 256; i++)
            psd.palette.push({ r: readUint8(reader), g: 0, b: 0 });
          for (let i = 0; i < 256; i++)
            psd.palette[i].g = readUint8(reader);
          for (let i = 0; i < 256; i++)
            psd.palette[i].b = readUint8(reader);
        } else {
        }
        skipBytes(reader, left());
      });
      const imageResources = {};
      let unreadResourceBytes = 0;
      readSection(reader, 1, (left) => {
        while (left() >= 12) {
          const signature = realignWithSignature(reader, isValidSignature);
          const id = readUint16(reader);
          const nameLength = readUint8(reader);
          const name = readBytes(reader, nameLength);
          skipBytes(reader, (nameLength + 1) % 2);
          readSection(reader, 2, (left2) => {
            const handler = imageResources_1.resourceHandlersMap[id];
            if (handler) {
              const skip = id === 1036 && !!reader.skipThumbnail || !(0, imageResources_1.shouldReadResource)(handler, reader.imageResourcesWhitelistSet);
              if (skip) {
                skipBytes(reader, left2());
              } else {
                try {
                  handler.read(reader, imageResources, left2, { signature, id, name, width, height });
                } catch (e) {
                  if (reader.throwForMissingFeatures)
                    throw e;
                  skipBytes(reader, left2());
                }
              }
            } else {
              reader.logMissingFeatures && reader.log(`Unhandled image resource: ${id} (${left2()})`);
              skipBytes(reader, left2());
            }
          });
        }
        unreadResourceBytes = left();
        skipBytes(reader, left());
      });
      if (unreadResourceBytes && !sectionFits(reader, reader.offset) && sectionFits(reader, reader.offset - unreadResourceBytes)) {
        reader.offset -= unreadResourceBytes;
      }
      const { layersGroup, layerGroupsEnabledId, savedPathsOrigination } = imageResources, rest = __rest(imageResources, ["layersGroup", "layerGroupsEnabledId", "savedPathsOrigination"]);
      if (Object.keys(rest).length) {
        psd.imageResources = rest;
      }
      readSection(reader, 1, (left) => {
        readSection(reader, 2, (left2) => {
          readLayerInfo(reader, psd, imageResources);
          skipBytes(reader, left2());
        }, void 0, reader.large);
        if (left() > 0) {
          const globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
          if (globalLayerMaskInfo)
            psd.globalLayerMaskInfo = globalLayerMaskInfo;
        } else {
          skipBytes(reader, left());
        }
        while (left() > 0) {
          while (left() && peekUint8(reader) === 0) {
            skipBytes(reader, 1);
          }
          if (left() >= 12) {
            readAdditionalLayerInfo(reader, psd, psd, imageResources);
          } else {
            skipBytes(reader, left());
          }
        }
      }, void 0, reader.large);
      const hasChildren = psd.children && psd.children.length;
      const skipComposite = reader.skipCompositeImageData && (reader.skipLayerImageData || hasChildren);
      if (!skipComposite) {
        if (reader.useRawData) {
          const rawOffset = Math.min(reader.offset, reader.view.byteLength);
          const rawCompositeData = new Uint8Array(reader.view.buffer, reader.view.byteOffset + rawOffset, reader.view.byteLength - rawOffset);
          psd.rawCompositeData = rawCompositeData;
          psd.rawCompositeDataInfo = { large: reader.large, globalAlpha: reader.globalAlpha };
          if (reader.layersInGlobalInfo)
            psd.rawCompositeDataInfo.layersInGlobalInfo = true;
        } else {
          const imageData = readImageData(reader, psd);
          if (reader.useImageData) {
            psd.imageData = imageData;
          } else {
            psd.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
          }
        }
      }
      return psd;
    }
    function readLayerInfo(reader, psd, imageResources) {
      var _a, _b;
      const { layersGroup = [], layerGroupsEnabledId = [] } = imageResources;
      let layerCount = readInt16(reader);
      if (layerCount < 0) {
        reader.globalAlpha = true;
        layerCount = -layerCount;
      }
      const layers = [];
      const layerChannels = [];
      for (let i = 0; i < layerCount; i++) {
        const { layer, channels } = readLayerRecord(reader, psd, imageResources);
        if (layersGroup[i] !== void 0)
          layer.linkGroup = layersGroup[i];
        if (layerGroupsEnabledId[i] !== void 0)
          layer.linkGroupEnabled = !!layerGroupsEnabledId[i];
        layers.push(layer);
        layerChannels.push(channels);
      }
      for (let i = 0; i < layerCount; i++) {
        readLayerChannelImageData(reader, psd, layers[i], layerChannels[i]);
      }
      if (!psd.children)
        psd.children = [];
      const stack = [psd];
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        const type = l.sectionDivider ? l.sectionDivider.type : 0;
        if (type === 1 || type === 2) {
          l.opened = type === 1;
          l.children = [];
          delete l.canvas;
          delete l.imageData;
          if ((_a = l.sectionDivider) === null || _a === void 0 ? void 0 : _a.key) {
            l.blendMode = (_b = helpers_1.toBlendMode[l.sectionDivider.key]) !== null && _b !== void 0 ? _b : l.blendMode;
          }
          stack[stack.length - 1].children.unshift(l);
          stack.push(l);
        } else if (type === 3) {
          if (stack.length > 1)
            stack.pop();
        } else {
          stack[stack.length - 1].children.unshift(l);
        }
      }
    }
    function readLayerRecord(reader, psd, imageResources) {
      const layer = {};
      layer.top = readInt32(reader);
      layer.left = readInt32(reader);
      layer.bottom = readInt32(reader);
      layer.right = readInt32(reader);
      if (!isValidBoxSize(layer, reader))
        throw new Error("Invalid layer size");
      const channelCount = readUint16(reader);
      const channels = [];
      for (let i = 0; i < channelCount; i++) {
        let id = readInt16(reader);
        let length = readUint32(reader);
        if (reader.large) {
          if (length !== 0)
            throw new Error("Sizes larger than 4GB are not supported");
          length = readUint32(reader);
        }
        channels.push({ id, length });
      }
      checkSignature(reader, "8BIM");
      const blendMode = readSignature(reader);
      if (!helpers_1.toBlendMode[blendMode]) {
        if (reader.throwForMissingFeatures)
          throw new Error(`Invalid blend mode: '${blendMode}'`);
        reader.logMissingFeatures && reader.log(`Unknown blend mode: '${blendMode}', using normal blend mode`);
      }
      layer.blendMode = helpers_1.toBlendMode[blendMode] || "normal";
      layer.opacity = readUint8(reader) / 255;
      layer.clipping = readUint8(reader) === 1;
      const flags = readUint8(reader);
      layer.transparencyProtected = (flags & 1) !== 0;
      layer.hidden = (flags & 2) !== 0;
      if (flags & 32)
        layer.effectsOpen = true;
      skipBytes(reader, 1);
      readSection(reader, 1, (left) => {
        readLayerMaskData(reader, layer);
        const blendingRanges = readLayerBlendingRanges(reader);
        if (blendingRanges)
          layer.blendingRanges = blendingRanges;
        layer.name = readPascalString(reader, 1);
        while (left() > 4 && !validSignatureAt(reader, reader.offset))
          reader.offset++;
        while (left() >= 12)
          readAdditionalLayerInfo(reader, layer, psd, imageResources);
        skipBytes(reader, left());
      });
      return { layer, channels };
    }
    function sectionFits(reader, offset) {
      const lengthSize = reader.large ? 8 : 4;
      if (offset < 0 || offset + lengthSize > reader.view.byteLength)
        return false;
      const length = reader.large ? reader.view.getUint32(offset) * 4294967296 + reader.view.getUint32(offset + 4) : reader.view.getUint32(offset);
      return offset + lengthSize + length <= reader.view.byteLength;
    }
    function isValidBoxSize(box, reader) {
      const width = (box.right || 0) - (box.left || 0);
      const height = (box.bottom || 0) - (box.top || 0);
      const maxSize = reader.large ? 3e5 : 3e4;
      return width <= maxSize && height <= maxSize;
    }
    function readLayerMaskData(reader, layer) {
      return readSection(reader, 1, (left) => {
        if (!left())
          return void 0;
        const mask = {};
        layer.mask = mask;
        mask.top = readInt32(reader);
        mask.left = readInt32(reader);
        mask.bottom = readInt32(reader);
        mask.right = readInt32(reader);
        if (!isValidBoxSize(mask, reader))
          throw new Error("Invalid mask size");
        mask.defaultColor = readUint8(reader);
        const flags = readUint8(reader);
        mask.positionRelativeToLayer = (flags & 1) !== 0;
        mask.disabled = (flags & 2) !== 0;
        mask.fromVectorData = (flags & 8) !== 0;
        if (hasRealMaskData(reader, flags, left())) {
          const realMask = {};
          layer.realMask = realMask;
          const realFlags = readUint8(reader);
          realMask.positionRelativeToLayer = (realFlags & 1) !== 0;
          realMask.disabled = (realFlags & 2) !== 0;
          realMask.fromVectorData = (realFlags & 8) !== 0;
          realMask.defaultColor = readUint8(reader);
          realMask.top = readInt32(reader);
          realMask.left = readInt32(reader);
          realMask.bottom = readInt32(reader);
          realMask.right = readInt32(reader);
          if (!isValidBoxSize(realMask, reader))
            throw new Error("Invalid realMask size");
        }
        if (flags & 16) {
          const params = readUint8(reader);
          if (params & 1)
            mask.userMaskDensity = readUint8(reader) / 255;
          if (params & 2)
            mask.userMaskFeather = readFloat64(reader);
          if (params & 4)
            mask.vectorMaskDensity = readUint8(reader) / 255;
          if (params & 8)
            mask.vectorMaskFeather = readFloat64(reader);
        }
        skipBytes(reader, left());
      });
    }
    function maskParamsSize(params) {
      return 1 + (params & 1 ? 1 : 0) + (params & 2 ? 8 : 0) + (params & 4 ? 1 : 0) + (params & 8 ? 8 : 0);
    }
    function isMaskParamsLayout(view, offset, left) {
      if (left < 1)
        return false;
      const params = view.getUint8(offset);
      if (params === 0 || params & ~15)
        return false;
      const size = maskParamsSize(params);
      if (left < size || left - size > 3)
        return false;
      for (let i = size; i < left; i++) {
        if (view.getUint8(offset + i) !== 0)
          return false;
      }
      return true;
    }
    function hasRealMaskData(reader, flags, left) {
      if (left < 18)
        return false;
      if (!(flags & 16))
        return true;
      const { view, offset } = reader;
      if (isMaskParamsLayout(view, offset, left))
        return false;
      if (isMaskParamsLayout(view, offset + 18, left - 18))
        return true;
      return left === 18 || left - 18 >= maskParamsSize(view.getUint8(offset + 18));
    }
    function readBlendingRange(reader) {
      return [readUint8(reader), readUint8(reader), readUint8(reader), readUint8(reader)];
    }
    function readLayerBlendingRanges(reader) {
      return readSection(reader, 1, (left) => {
        const compositeGrayBlendSource = readBlendingRange(reader);
        const compositeGraphBlendDestinationRange = readBlendingRange(reader);
        const ranges = [];
        while (left() > 0) {
          const sourceRange = readBlendingRange(reader);
          const destRange = readBlendingRange(reader);
          ranges.push({ sourceRange, destRange });
        }
        return { compositeGrayBlendSource, compositeGraphBlendDestinationRange, ranges };
      });
    }
    function readLayerChannelImageData(reader, psd, layer, channels) {
      if (reader.skipLayerImageData)
        return;
      const { colorMode = 3, bitsPerChannel = 8 } = psd;
      layer.rawData = { colorMode, bitsPerChannel, channels: [], large: reader.large };
      for (const channel of channels) {
        const start = reader.offset;
        let compression = 0;
        let data = void 0;
        if (channel.length >= 2) {
          compression = readUint16(reader);
          if (compression > 3) {
            reader.offset -= 1;
            compression = readUint16(reader);
          }
          if (compression > 3) {
            reader.offset -= 4;
            compression = readUint16(reader);
          }
          if (compression > 3)
            throw new Error(`Invalid compression: ${compression}`);
          if (channel.length > 2) {
            data = readBytes(reader, channel.length - 2);
          }
        }
        reader.offset = start + channel.length;
        layer.rawData.channels.push({ id: channel.id, compression, data });
      }
      if (!reader.useRawData) {
        try {
          decodeLayerImageData(layer, reader);
        } catch (e) {
          if (reader.throwForMissingFeatures || e.message === "Exceeded memory limit")
            throw e;
          reader.logMissingFeatures && reader.log(`Failed to decode layer image data: ${e.message}`);
          delete layer.rawData;
        }
      }
    }
    function resetAlpha({ data }, cmyk) {
      const alpha = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
      const offset = (cmyk ? 4 : 3) | 0;
      const length = data.length | 0;
      const step = (cmyk ? 5 : 4) | 0;
      for (let p = offset; p < length; p = p + step | 0) {
        data[p] = alpha;
      }
    }
    function getCompositeImageData(psd) {
      const data = psd.rawCompositeData;
      if (!data)
        return void 0;
      const reader = createReader(data.buffer, data.byteOffset, data.byteLength);
      const info = psd.rawCompositeDataInfo;
      if (info) {
        reader.large = info.large;
        reader.globalAlpha = info.globalAlpha;
        reader.layersInGlobalInfo = !!info.layersInGlobalInfo;
      }
      return readImageData(reader, psd);
    }
    function getCompositeCanvas(psd) {
      return imageDataToCanvasSafe(getCompositeImageData(psd));
    }
    function getLayerImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.Layer, false, void 0);
    }
    function getLayerMaskImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.Mask, false, void 0);
    }
    function getLayerRealMaskImageData(layer) {
      return getDataFromLayer(layer, LayerDataType.RealMask, false, void 0);
    }
    function getLayerCanvas(layer) {
      return imageDataToCanvasSafe(getLayerImageData(layer));
    }
    function getLayerMaskCanvas(layer) {
      return imageDataToCanvasSafe(getLayerMaskImageData(layer));
    }
    function getLayerRealMaskCanvas(layer) {
      return imageDataToCanvasSafe(getLayerRealMaskImageData(layer));
    }
    function getFilterEffectsMaskImageData(mask) {
      const {
        depth,
        channels,
        colorMode = 3
        /* ColorMode.RGB */
      } = mask;
      const width = Math.max(0, mask.right - mask.left);
      const height = Math.max(0, mask.bottom - mask.top);
      if (!width || !height)
        return void 0;
      const cmyk = colorMode === 4;
      if (cmyk && depth !== 8 && depth !== 16)
        throw new Error("bitsPerChannel not supported");
      const step = cmyk ? 5 : 4;
      const transparencyIndex = channels.length - 1;
      const colorChannels = Math.min(cmyk ? 4 : colorMode === 1 ? 1 : 3, channels.length - 2);
      let imageData = createImageDataBitDepth(width, height, depth, step, void 0);
      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        if (!channel)
          continue;
        if (i < colorChannels) {
          readFilterEffectsChannel(channel, imageData, width, height, depth, i, step);
        } else if (i === transparencyIndex) {
          readFilterEffectsChannel(channel, imageData, width, height, depth, step - 1, step);
        }
      }
      if (colorMode === 1)
        setupGrayscale(imageData);
      if (!channels[transparencyIndex])
        resetAlpha(imageData, cmyk);
      if (cmyk) {
        const cmykData = imageData;
        imageData = createImageDataBitDepth(cmykData.width, cmykData.height, depth, 4, void 0);
        cmykToRgb(cmykData, imageData, false);
      }
      return imageData;
    }
    function getFilterEffectsMaskExtraImageData(mask) {
      const { extra, depth } = mask;
      if (!extra)
        return void 0;
      const width = Math.max(0, extra.right - extra.left);
      const height = Math.max(0, extra.bottom - extra.top);
      if (!width || !height)
        return void 0;
      const maskData = createImageDataBitDepth(width, height, depth, 4, void 0);
      readFilterEffectsChannel(extra, maskData, width, height, depth, 0, 4);
      setupGrayscale(maskData);
      resetAlpha(maskData, false);
      return maskData;
    }
    function getFilterEffectsMaskCanvas(mask) {
      return imageDataToCanvasSafe(getFilterEffectsMaskImageData(mask));
    }
    function getFilterEffectsMaskExtraCanvas(mask) {
      return imageDataToCanvasSafe(getFilterEffectsMaskExtraImageData(mask));
    }
    function readFilterEffectsChannel({ compressionMode, data }, pixels, width, height, depth, offset, step) {
      const reader = createReader(data.buffer, data.byteOffset, data.byteLength);
      readData(reader, data.byteLength, pixels, compressionMode, width, height, depth, offset, true, step);
    }
    function imageDataToCanvasSafe(imageData) {
      return imageData && (0, helpers_1.imageDataToCanvas)(imageData);
    }
    function setImageDataOrCanvas(obj, imageData, useImageData) {
      if (!imageData)
        return;
      if (useImageData) {
        obj.imageData = imageData;
      } else {
        obj.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
      }
    }
    function decodeLayerPixels(layer, useImageData) {
      decodeLayerImageData(layer, { useImageData });
    }
    function decodeLayerImageData(layer, options) {
      var _a, _b, _c;
      let { throwForMissingFeatures, useImageData } = options;
      const imageData = getDataFromLayer(layer, LayerDataType.Layer, throwForMissingFeatures, options.totalMemoryLimit, options);
      setImageDataOrCanvas(layer, imageData, useImageData);
      if (options.totalMemoryLimit !== void 0)
        options.totalMemoryLimit -= (_a = imageData === null || imageData === void 0 ? void 0 : imageData.data.byteLength) !== null && _a !== void 0 ? _a : 0;
      if (layer.mask) {
        const maskData = getDataFromLayer(layer, LayerDataType.Mask, throwForMissingFeatures, options.totalMemoryLimit, options);
        setImageDataOrCanvas(layer.mask, maskData, useImageData);
        if (options.totalMemoryLimit !== void 0)
          options.totalMemoryLimit -= (_b = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _b !== void 0 ? _b : 0;
      }
      if (layer.realMask) {
        const maskData = getDataFromLayer(layer, LayerDataType.RealMask, throwForMissingFeatures, options.totalMemoryLimit, options);
        setImageDataOrCanvas(layer.realMask, maskData, useImageData);
        if (options.totalMemoryLimit !== void 0)
          options.totalMemoryLimit -= (_c = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _c !== void 0 ? _c : 0;
      }
      delete layer.rawData;
    }
    var LayerDataType;
    (function(LayerDataType2) {
      LayerDataType2[LayerDataType2["Layer"] = 0] = "Layer";
      LayerDataType2[LayerDataType2["Mask"] = 1] = "Mask";
      LayerDataType2[LayerDataType2["RealMask"] = 2] = "RealMask";
    })(LayerDataType || (LayerDataType = {}));
    function getDataFromLayer(layer, read, throwForMissingFeatures, memoryLimit, logOptions) {
      var _a;
      if (!layer.rawData)
        return void 0;
      const { colorMode, bitsPerChannel, channels, large } = layer.rawData;
      const layerWidth = Math.max(0, (layer.right || 0) - (layer.left || 0));
      const layerHeight = Math.max(0, (layer.bottom || 0) - (layer.top || 0));
      const cmyk = colorMode === 4;
      let imageData;
      let maskData;
      let initializedAlpha = false;
      if (layerWidth && layerHeight && read === LayerDataType.Layer) {
        if (cmyk) {
          if (bitsPerChannel !== 8 && bitsPerChannel !== 16)
            throw new Error("bitsPerChannel not supported");
          imageData = createImageDataBitDepth(layerWidth, layerHeight, bitsPerChannel, 5, memoryLimit);
        } else {
          imageData = createImageDataBitDepth(layerWidth, layerHeight, bitsPerChannel, 4, memoryLimit);
        }
      }
      for (const { id, compression, data } of channels) {
        if (!data)
          continue;
        const dataReader = createReader(data.buffer, data.byteOffset, data.byteLength);
        dataReader.debug = !!(logOptions === null || logOptions === void 0 ? void 0 : logOptions.debug);
        if (logOptions === null || logOptions === void 0 ? void 0 : logOptions.log)
          dataReader.log = logOptions.log;
        if (memoryLimit !== void 0)
          dataReader.totalMemoryLimit = Math.max(0, memoryLimit - ((_a = imageData === null || imageData === void 0 ? void 0 : imageData.data.byteLength) !== null && _a !== void 0 ? _a : 0));
        if (id === -2 || id === -3) {
          if (id === -2 && read !== LayerDataType.Mask)
            continue;
          if (id === -3 && read !== LayerDataType.RealMask)
            continue;
          const mask = id === -2 ? layer.mask : layer.realMask;
          if (!mask)
            throw new Error(`Missing layer ${id === -2 ? "mask" : "real mask"} data`);
          const maskWidth = Math.max(0, (mask.right || 0) - (mask.left || 0));
          const maskHeight = Math.max(0, (mask.bottom || 0) - (mask.top || 0));
          if (maskWidth && maskHeight) {
            maskData = createImageDataBitDepth(maskWidth, maskHeight, bitsPerChannel, 4, memoryLimit);
            if (memoryLimit !== void 0)
              dataReader.totalMemoryLimit = Math.max(0, dataReader.totalMemoryLimit - maskData.data.byteLength);
            readData(dataReader, data.byteLength, maskData, compression, maskWidth, maskHeight, bitsPerChannel, 0, large, 4);
            setupGrayscale(maskData);
            resetAlpha(maskData, false);
          }
        } else {
          if (read !== LayerDataType.Layer)
            continue;
          const offset = (0, helpers_1.offsetForChannel)(id, cmyk);
          let targetData = imageData;
          if (offset < 0) {
            targetData = void 0;
            if (throwForMissingFeatures) {
              throw new Error(`Channel not supported: ${id}`);
            }
          }
          readData(dataReader, data.byteLength, targetData, compression, layerWidth, layerHeight, bitsPerChannel, offset, large, cmyk ? 5 : 4);
        }
        if (id === -1) {
          initializedAlpha = true;
        }
      }
      if (imageData) {
        if (colorMode === 1)
          setupGrayscale(imageData);
        if (!initializedAlpha)
          resetAlpha(imageData, cmyk);
        if (cmyk) {
          const cmykData = imageData;
          const rgbMemoryLimit = memoryLimit === void 0 ? void 0 : Math.max(0, memoryLimit - cmykData.data.byteLength);
          imageData = createImageDataBitDepth(cmykData.width, cmykData.height, bitsPerChannel, 4, rgbMemoryLimit);
          cmykToRgb(cmykData, imageData, false);
        }
      }
      return read === LayerDataType.Layer ? imageData : maskData;
    }
    function readData(reader, length, pixels, compression, width, height, bitDepth, offset, large, step) {
      if (!length)
        return;
      if (compression === 0) {
        if (length !== width * height * Math.floor(bitDepth / 8)) {
          warnOrThrow(reader, `Invalid length (${length}, ${width * height * Math.floor(bitDepth / 8)})`);
        }
        const data = readBytes(reader, length);
        readDataRaw(data, pixels, bitDepth, step, offset);
      } else if (compression === 1) {
        readDataRLE(reader, pixels, width, height, bitDepth, step, [offset], large);
      } else if (compression === 2) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, false, reader);
      } else if (compression === 3) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, true, reader);
      } else {
        throw new Error(`Invalid Compression type: ${compression}`);
      }
    }
    function readGlobalLayerMaskInfo(reader) {
      return readSection(reader, 1, (left) => {
        if (!left())
          return void 0;
        const overlayColorSpace = readUint16(reader);
        const colorSpace1 = readUint16(reader);
        const colorSpace2 = readUint16(reader);
        const colorSpace3 = readUint16(reader);
        const colorSpace4 = readUint16(reader);
        const opacity = Math.min(readUint16(reader), 100) / 100;
        const kind = readUint8(reader);
        skipBytes(reader, left());
        return { overlayColorSpace, colorSpace1, colorSpace2, colorSpace3, colorSpace4, opacity, kind };
      });
    }
    var fixOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    function realignWithSignature(reader, isValid) {
      const sigOffset = reader.offset;
      let sig = "";
      for (const offset of fixOffsets) {
        try {
          reader.offset = sigOffset + offset;
          sig = readSignature(reader);
        } catch (_a) {
        }
        if (isValid(sig))
          break;
      }
      if (!isValid(sig)) {
        throw new Error(`Invalid signature: '${sig}' at 0x${sigOffset.toString(16)}`);
      }
      return sig;
    }
    function isValidAdditionalInfoSignature(sig) {
      return sig === "8BIM" || sig === "8B64";
    }
    function readAdditionalLayerInfo(reader, target, psd, imageResources) {
      const sig = realignWithSignature(reader, isValidAdditionalInfoSignature);
      const key = readSignature(reader);
      let u64 = sig === "8B64" || reader.large && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1;
      if (reader.large && sig === "8BIM" && helpers_1.largeAdditionalInfoKeysObserved.indexOf(key) !== -1) {
        const next = reader.offset + 8 <= reader.view.byteLength ? reader.view.getUint32(reader.offset + 4) : 0;
        const nextIsSignature = next === 943868237 || next === 943863348;
        u64 = reader.view.getUint32(reader.offset) === 0 && !nextIsSignature;
      }
      readSection(reader, 2, (left) => {
        const handler = additionalInfo_1.infoHandlersMap[key];
        if (handler) {
          handler.read(reader, target, left, psd, imageResources);
        } else {
          reader.logMissingFeatures && key !== "GenI" && key !== "OCIO" && key !== "CAI " && reader.log(`Unhandled additional info: ${key}`);
          skipBytes(reader, left());
        }
        if (left()) {
          reader.logMissingFeatures && reader.log(`Unread ${left()} bytes left for additional info: ${key}`);
          skipBytes(reader, left());
        }
      }, false, u64);
    }
    function createImageDataBitDepth(width, height, bitDepth, channels, memoryLimit) {
      const sizeInBytes = width * height * channels * Math.max(1, bitDepth / 8);
      if (memoryLimit !== void 0 && sizeInBytes > memoryLimit)
        throw new Error("Exceeded memory limit");
      if (bitDepth === 1 || bitDepth === 8) {
        if (channels === 4) {
          return (0, helpers_1.createImageData)(width, height);
        } else {
          return { width, height, data: new Uint8ClampedArray(width * height * channels) };
        }
      } else if (bitDepth === 16) {
        return { width, height, data: new Uint16Array(width * height * channels) };
      } else if (bitDepth === 32) {
        return { width, height, data: new Float32Array(width * height * channels) };
      } else {
        throw new Error(`Invalid bitDepth (${bitDepth})`);
      }
    }
    function readImageData(reader, psd) {
      var _a, _b, _c;
      const compression = readUint16(reader);
      const bitsPerChannel = (_a = psd.bitsPerChannel) !== null && _a !== void 0 ? _a : 8;
      const { width, height } = psd;
      if (exports.supportedColorModes.indexOf(psd.colorMode) === -1)
        throw new Error(`Color mode not supported: ${psd.colorMode}`);
      if (compression !== 0 && compression !== 1)
        throw new Error(`Compression type not supported: ${compression}`);
      const imageData = createImageDataBitDepth(width, height, bitsPerChannel, 4, reader.totalMemoryLimit);
      if (reader.totalMemoryLimit !== void 0)
        reader.totalMemoryLimit -= imageData.data.byteLength;
      (0, helpers_1.resetImageData)(imageData);
      switch (psd.colorMode) {
        case 0: {
          if (bitsPerChannel !== 1)
            throw new Error("Invalid bitsPerChannel for bitmap color mode");
          const rowBytes = Math.ceil(width / 8);
          let bytes;
          if (compression === 0) {
            bytes = readBytes(reader, rowBytes * height);
          } else {
            bytes = new Uint8Array(rowBytes * height);
            readDataRLE(reader, { data: bytes, width: rowBytes, height }, rowBytes, height, 8, 1, [0], reader.large);
          }
          (0, helpers_1.decodeBitmap)(bytes, imageData.data, width, height);
          break;
        }
        case 3:
        case 1: {
          const colorChannels = psd.colorMode === 1 ? 1 : 3;
          const offsets = compositeChannelOffsets(reader, psd, colorChannels, 3);
          readCompositeChannels(reader, compression, imageData, bitsPerChannel, 4, offsets);
          if (psd.colorMode === 1) {
            setupGrayscale(imageData);
          }
          break;
        }
        case 2: {
          if (bitsPerChannel !== 8)
            throw new Error("bitsPerChannel not supported");
          if (!psd.palette)
            throw new Error("Missing color palette");
          const offsets = compositeChannelOffsets(reader, psd, 1, -1);
          const indexedImageData = { width, height, data: new Uint8Array(width * height) };
          readCompositeChannels(reader, compression, indexedImageData, 8, 1, offsets);
          indexedToRgb(indexedImageData, imageData, psd.palette, (_c = (_b = psd.imageResources) === null || _b === void 0 ? void 0 : _b.transparencyIndex) !== null && _c !== void 0 ? _c : -1);
          break;
        }
        case 4: {
          if (bitsPerChannel !== 8 && bitsPerChannel !== 16)
            throw new Error("bitsPerChannel not supported");
          const offsets = compositeChannelOffsets(reader, psd, 4, 4);
          const cmykImageData = createImageDataBitDepth(width, height, bitsPerChannel, 5, reader.totalMemoryLimit);
          resetAlpha(cmykImageData, true);
          readCompositeChannels(reader, compression, cmykImageData, bitsPerChannel, 5, offsets);
          cmykToRgb(cmykImageData, imageData, !!reader.globalAlpha);
          break;
        }
        default:
          throw new Error(`Color mode not supported: ${psd.colorMode}`);
      }
      if (reader.globalAlpha && psd.colorMode !== 4) {
        removeWhiteMatte(imageData);
      }
      return imageData;
    }
    function compositeChannelOffsets(reader, psd, colorChannels, alphaOffset) {
      var _a, _b, _c;
      const channelCount = (_a = psd.channels) !== null && _a !== void 0 ? _a : colorChannels + (reader.globalAlpha ? 1 : 0);
      if (channelCount < colorChannels)
        throw new Error(`Invalid channel count: ${channelCount}`);
      const alphaNames = (_c = (_b = psd.imageResources) === null || _b === void 0 ? void 0 : _b.alphaChannelNames) !== null && _c !== void 0 ? _c : [];
      const namedChannels = alphaNames.length;
      const namedTransparency = !!reader.layersInGlobalInfo && alphaNames[0] === "Transparency" && namedChannels === channelCount - colorChannels;
      const hasTransparency = reader.globalAlpha || namedTransparency || channelCount - colorChannels > namedChannels;
      const offsets = [];
      for (let i = 0; i < channelCount; i++) {
        if (i < colorChannels) {
          offsets.push(i);
        } else if (i === colorChannels && hasTransparency && alphaOffset >= 0) {
          offsets.push(alphaOffset);
        } else {
          offsets.push(-1);
        }
      }
      return offsets;
    }
    function readCompositeChannels(reader, compression, pixelData, bitsPerChannel, step, offsets) {
      if (compression === 0) {
        const channelSize = pixelData.width * pixelData.height * bytesPerValue(bitsPerChannel);
        for (const offset of offsets) {
          if (offset < 0) {
            skipBytes(reader, channelSize);
          } else {
            readDataRaw(readBytes(reader, channelSize), pixelData, bitsPerChannel, step, offset);
          }
        }
      } else if (compression === 1) {
        readDataRLE(reader, pixelData, pixelData.width, pixelData.height, bitsPerChannel, step, offsets, reader.large);
      } else {
        throw new Error(`Compression not supported: ${compression}`);
      }
    }
    function removeWhiteMatte({ data, width, height }) {
      const size = width * height * 4;
      if (data instanceof Float32Array) {
        for (let i = 0; i < size; i += 4) {
          const a = data[i + 3];
          if (a > 0 && a < 1) {
            const ra = 1 / a;
            const invA = 1 - ra;
            for (let j = 0; j < 3; j++) {
              const v = data[i + j] * ra + invA;
              data[i + j] = v < 0 ? 0 : v;
            }
          }
        }
      } else if (data instanceof Uint16Array) {
        for (let i = 0; i < size; i += 4) {
          const pa = data[i + 3];
          if (pa !== 0 && pa !== 65535) {
            const ra = 65535 / pa;
            const invA = 65535 * (1 - ra);
            for (let j = 0; j < 3; j++) {
              const v = Math.round(data[i + j] * ra + invA);
              data[i + j] = v < 0 ? 0 : v > 65535 ? 65535 : v;
            }
          }
        }
      } else {
        for (let i = 0; i < size; i += 4) {
          const pa = data[i + 3];
          if (pa != 0 && pa != 255) {
            const a = pa / 255;
            const ra = 1 / a;
            const invA = 255 * (1 - ra);
            data[i + 0] = data[i + 0] * ra + invA;
            data[i + 1] = data[i + 1] * ra + invA;
            data[i + 2] = data[i + 2] * ra + invA;
          }
        }
      }
    }
    function toRange(value, max) {
      value = Math.round(value * (max / 255));
      return value <= 0 ? 0 : value >= max ? max : value;
    }
    function cmykToRgb(cmyk, rgb, removeMatte) {
      const size = rgb.width * rgb.height * 4;
      const srcData = cmyk.data;
      const dstData = rgb.data;
      const srcMax = srcData instanceof Uint16Array ? 65535 : 255;
      const dstMax = dstData instanceof Uint16Array ? 65535 : 255;
      const out = [0, 0, 0];
      for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
        const a = srcData[src + 4];
        let c = 1 - srcData[src] / srcMax;
        let m = 1 - srcData[src + 1] / srcMax;
        let y = 1 - srcData[src + 2] / srcMax;
        let k = 1 - srcData[src + 3] / srcMax;
        if (removeMatte && a > 0 && a < srcMax) {
          const ra = srcMax / a;
          c = Math.min(1, c * ra);
          m = Math.min(1, m * ra);
          y = Math.min(1, y * ra);
          k = Math.min(1, k * ra);
        }
        (0, helpers_1.cmykToRgbValues)(c, m, y, k, out);
        dstData[dst] = toRange(out[0], dstMax);
        dstData[dst + 1] = toRange(out[1], dstMax);
        dstData[dst + 2] = toRange(out[2], dstMax);
        dstData[dst + 3] = srcMax === dstMax ? a : Math.round(a * dstMax / srcMax);
      }
    }
    function indexedToRgb(indexed, rgb, palette, transparencyIndex) {
      const size = indexed.width * indexed.height;
      const srcData = indexed.data;
      const dstData = rgb.data;
      for (let src = 0, dst = 0; src < size; src++, dst += 4) {
        const index = srcData[src];
        const c = palette[index];
        dstData[dst + 0] = c.r;
        dstData[dst + 1] = c.g;
        dstData[dst + 2] = c.b;
        dstData[dst + 3] = index === transparencyIndex ? 0 : 255;
      }
    }
    function bytesPerValue(bitDepth) {
      switch (bitDepth) {
        case 1:
        case 8:
          return 1;
        case 16:
          return 2;
        case 32:
          return 4;
        default:
          throw new Error(`Invalid bitDepth (${bitDepth})`);
      }
    }
    function verifyArrayType(data, bytesPerValue2) {
      if (data.BYTES_PER_ELEMENT !== bytesPerValue2) {
        throw new Error("Invalid array types");
      }
    }
    function readDataRaw(buffer, pixelData, bitDepth, step, offset) {
      const bpv = bytesPerValue(bitDepth);
      if (!pixelData || offset < 0 || offset >= step)
        return;
      const data = pixelData.data;
      verifyArrayType(data, bpv);
      const size = Math.min(pixelData.width * pixelData.height, Math.floor(buffer.byteLength / bpv)) | 0;
      if (bpv === 1) {
        for (let i = 0, p = offset | 0; i < size; i++, p = p + step | 0) {
          data[p] = buffer[i];
        }
      } else if (bpv === 2) {
        for (let i = 0, j = 0, p = offset | 0; i < size; i++, j += 2, p = p + step | 0) {
          data[p] = buffer[j] << 8 | buffer[j + 1];
        }
      } else {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        for (let i = 0, j = 0, p = offset | 0; i < size; i++, j += 4, p = p + step | 0) {
          data[p] = view.getFloat32(j, false);
        }
      }
    }
    function decodePredicted(data, width, height) {
      for (let y = 0; y < height; y++) {
        const offset = y * width;
        for (let x = 1, o = offset + 1; x < width; x++, o++) {
          data[o] = data[o - 1] + data[o];
        }
      }
    }
    var zipOverflow = new Error("Decompressed data exceeds expected size");
    function inflateLimited(compressed, expectedSize, reader, raw = false) {
      const output = new Uint8Array(expectedSize);
      let position = 0;
      let overflow = false;
      const inflator = new pako_1.Inflate({ chunkSize: Math.max(1024, Math.min(expectedSize, 65536)), raw });
      inflator.onData = (chunk) => {
        const data = chunk;
        const count = Math.min(data.length, expectedSize - position);
        if (count > 0)
          output.set(count === data.length ? data : data.subarray(0, count), position);
        position += count;
        if (count < data.length) {
          overflow = true;
          throw zipOverflow;
        }
      };
      inflator.onEnd = (status) => {
        var _a;
        inflator.err = status;
        inflator.msg = ((_a = inflator.strm) === null || _a === void 0 ? void 0 : _a.msg) || "";
      };
      try {
        inflator.push(compressed, true);
      } catch (e) {
        if (e !== zipOverflow)
          throw e;
      }
      if (overflow) {
        if (reader)
          warnOrThrow(reader, zipOverflow.message);
      } else if (inflator.err && inflator.msg === "incorrect data check" && !raw) {
        if (reader)
          warnOrThrow(reader, `Invalid zip data: ${inflator.msg}`);
        return inflateLimited(compressed.subarray(2), expectedSize, reader, true);
      } else if (inflator.err) {
        throw new Error(`Invalid zip data: ${inflator.msg}`);
      }
      return output;
    }
    function readDataZip(compressed, pixelData, width, height, bitDepth, step, offset, prediction, reader) {
      const bpv = bytesPerValue(bitDepth);
      if (!pixelData || offset < 0 || offset >= step)
        return;
      const data = pixelData.data;
      verifyArrayType(data, bpv);
      const expectedSize = width * height * bpv;
      if (reader)
        consumeMemory(reader, expectedSize);
      try {
        const decompressed = inflateLimited(compressed, expectedSize, reader);
        if (bpv === 1) {
          for (let y = 0, i = 0; y < height; y++) {
            let prev = 0;
            for (let x = 0, p = offset + y * width * step; x < width; x++, i++, p += step) {
              let v = decompressed[i];
              if (prediction)
                v = prev = prev + v & 255;
              data[p] = v;
            }
          }
        } else if (bpv === 2) {
          for (let y = 0, i = 0; y < height; y++) {
            let prev = 0;
            for (let x = 0, p = offset + y * width * step; x < width; x++, i += 2, p += step) {
              let v = decompressed[i] << 8 | decompressed[i + 1];
              if (prediction)
                v = prev = prev + v & 65535;
              data[p] = v;
            }
          }
        } else {
          const dst = new Uint32Array(data.buffer, data.byteOffset, data.length);
          if (prediction) {
            decodePredicted(decompressed, width * 4, height);
            for (let y = 0, di = offset; y < height; y++) {
              let a = width * 4 * y;
              for (let x = 0; x < width; x++, a++, di += step) {
                const b = a + width;
                const c = b + width;
                const d = c + width;
                dst[di] = (decompressed[a] << 24 | decompressed[b] << 16 | decompressed[c] << 8 | decompressed[d]) >>> 0;
              }
            }
          } else {
            const view = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
            for (let i = 0, j = 0, di = offset, size = width * height; i < size; i++, j += 4, di += step) {
              dst[di] = view.getUint32(j, false);
            }
          }
        }
      } finally {
        if (reader)
          recoverMemory(reader, expectedSize);
      }
    }
    function decodeRLERow(src, i, end, dst, count) {
      let x = 0;
      while (i < end && x < count) {
        const header = src[i++];
        if (header > 128) {
          if (i >= end)
            break;
          const value = src[i++];
          let n = 257 - header;
          if (n > count - x)
            n = count - x;
          dst.fill(value, x, x + n);
          x += n;
        } else if (header < 128) {
          let n = header + 1;
          if (n > count - x)
            n = count - x;
          if (n > end - i)
            n = end - i;
          for (; n > 0; n--) {
            dst[x++] = src[i++];
          }
        } else {
        }
      }
      return x;
    }
    function decodeRLEChannel8(src, lengths, li, pos, width, height, data, offset, step) {
      const srcEnd = src.length | 0;
      for (let y = 0; y < height; y++, li++) {
        let i = (pos < srcEnd ? pos : srcEnd) | 0;
        pos += lengths[li];
        const end = (pos < srcEnd ? pos : srcEnd) | 0;
        let p = offset + y * width * step | 0;
        let x = 0;
        while (i < end && x < width) {
          const header = src[i++] | 0;
          if (header > 128) {
            if (i >= end)
              break;
            const value = src[i++] | 0;
            let n = 257 - header | 0;
            if (n > width - x)
              n = width - x | 0;
            x = x + n | 0;
            for (const pe = p + n * step | 0; p < pe; p = p + step | 0) {
              data[p] = value;
            }
          } else if (header < 128) {
            let n = header + 1 | 0;
            if (n > width - x)
              n = width - x | 0;
            if (n > end - i)
              n = end - i | 0;
            x = x + n | 0;
            for (const ie = i + n | 0; i < ie; i = i + 1 | 0, p = p + step | 0) {
              data[p] = src[i];
            }
          } else {
          }
        }
      }
    }
    function scatterValues(bytes, count, bpv, data, p, step) {
      if (bpv === 2) {
        for (let x = 0, i = 0; x < count; x++, i += 2, p += step) {
          data[p] = bytes[i] << 8 | bytes[i + 1];
        }
      } else {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (let x = 0, i = 0; x < count; x++, i += 4, p += step) {
          data[p] = view.getFloat32(i, false);
        }
      }
    }
    function decodeRLEChannelWide(src, lengths, li, pos, width, height, data, offset, step, bpv, row) {
      const srcEnd = src.length;
      const rowSize = width * bpv;
      for (let y = 0; y < height; y++, li++) {
        const rowStart = pos < srcEnd ? pos : srcEnd;
        pos += lengths[li];
        const rowEnd = pos < srcEnd ? pos : srcEnd;
        if (rowStart >= rowEnd)
          continue;
        const decoded = decodeRLERow(src, rowStart, rowEnd, row, rowSize);
        scatterValues(row, Math.floor(decoded / bpv), bpv, data, offset + y * width * step, step);
      }
    }
    function readDataRLE(reader, pixelData, width, height, bitDepth, step, offsets, large) {
      const data = pixelData && pixelData.data;
      const rows = offsets.length * height;
      const lengthSize = large ? 4 : 2;
      const lengthsMemory = rows * lengthSize;
      const srcEnd = reader.view.byteLength;
      const bpv = bytesPerValue(bitDepth);
      let lengths;
      consumeMemory(reader, lengthsMemory);
      try {
        if (reader.offset + lengthsMemory > srcEnd) {
          throw new Error("RLE row lengths exceed buffer length");
        }
        lengths = large ? new Uint32Array(rows) : new Uint16Array(rows);
        let total = 0;
        if (large) {
          for (let i = 0; i < rows; i++)
            total += lengths[i] = readUint32(reader);
        } else {
          for (let i = 0; i < rows; i++)
            total += lengths[i] = readUint16(reader);
        }
        if (total > srcEnd - reader.offset) {
          warnOrThrow(reader, "RLE data exceeds buffer length");
        }
        if (data)
          verifyArrayType(data, bpv);
      } catch (e) {
        recoverMemory(reader, lengthsMemory);
        throw e;
      }
      const src = new Uint8Array(reader.view.buffer, reader.view.byteOffset, srcEnd);
      const row = data && bpv > 1 ? new Uint8Array(width * bpv) : void 0;
      let pos = reader.offset;
      for (let c = 0, li = 0; c < offsets.length; c++, li += height) {
        const offset = offsets[c] | 0;
        const channelStart = pos;
        for (let y = 0; y < height; y++)
          pos += lengths[li + y];
        if (data && offset >= 0 && offset < step) {
          if (bpv === 1) {
            decodeRLEChannel8(src, lengths, li, channelStart, width, height, data, offset, step);
          } else {
            decodeRLEChannelWide(src, lengths, li, channelStart, width, height, data, offset, step, bpv, row);
          }
        }
      }
      reader.offset = pos;
      recoverMemory(reader, lengthsMemory);
    }
    function readSection(reader, round, func, skipEmpty = true, eightBytes = false) {
      let length = readUint32(reader);
      if (eightBytes) {
        if (length !== 0)
          throw new Error("Sizes larger than 4GB are not supported");
        length = readUint32(reader);
      }
      if (length <= 0 && skipEmpty)
        return void 0;
      let end = reader.offset + length;
      if (end > reader.view.byteLength)
        throw new Error("Section exceeds file size");
      const result = func(() => end - reader.offset);
      if (reader.offset !== end) {
        if (reader.offset > end) {
          warnOrThrow(reader, "Exceeded section limits");
        } else {
          warnOrThrow(reader, `Unread section data`);
        }
      }
      while (length % round) {
        length++;
        end++;
      }
      reader.offset = end;
      return result;
    }
    function readColor(reader) {
      const colorSpace = readUint16(reader);
      switch (colorSpace) {
        case 0: {
          const r = readUint16(reader) / 257;
          const g = readUint16(reader) / 257;
          const b = readUint16(reader) / 257;
          skipBytes(reader, 2);
          return { r, g, b };
        }
        case 1: {
          const h = readUint16(reader) / 65535;
          const s = readUint16(reader) / 65535;
          const b = readUint16(reader) / 65535;
          skipBytes(reader, 2);
          return { h, s, b };
        }
        case 2: {
          const c = (65535 - readUint16(reader)) / 257;
          const m = (65535 - readUint16(reader)) / 257;
          const y = (65535 - readUint16(reader)) / 257;
          const k = (65535 - readUint16(reader)) / 257;
          return { c, m, y, k };
        }
        case 7: {
          const l = readInt16(reader) / 1e4;
          const ta = readInt16(reader);
          const tb = readInt16(reader);
          const a = (0, helpers_1.normalizeLabAB)(ta, 100);
          const b = (0, helpers_1.normalizeLabAB)(tb, 100);
          skipBytes(reader, 2);
          return { l, a, b };
        }
        case 8: {
          const k = readUint16(reader) * 255 / 1e4;
          skipBytes(reader, 6);
          return { k };
        }
        default:
          throw new Error("Invalid color space");
      }
    }
    var MAX_PATTERN_SIZE = 3e4;
    function readPatternSafe(reader) {
      let length = reader.view.getUint32(reader.offset);
      while (length % 4)
        length++;
      const end = reader.offset + 4 + length;
      try {
        return readPattern(reader);
      } catch (e) {
        if (reader.throwForMissingFeatures)
          throw e;
        reader.logMissingFeatures && reader.log(`Skipped pattern: ${e.message}`);
        reader.offset = end;
        return void 0;
      }
    }
    function readPattern(reader) {
      let length = readUint32(reader);
      while (length % 4)
        length++;
      const end = reader.offset + length;
      const version = readUint32(reader);
      if (version !== 1)
        throw new Error(`Invalid pattern version: ${version}`);
      const colorMode = readUint32(reader);
      const x = readInt16(reader);
      const y = readInt16(reader);
      if (colorMode !== 3 && colorMode !== 1 && colorMode !== 2 && colorMode !== 4) {
        throw new Error(`Unsupported pattern color mode: ${colorMode}`);
      }
      let name = readUnicodeString(reader);
      const id = readPascalString(reader, 1);
      const palette = [];
      if (colorMode === 2) {
        for (let i = 0; i < 256; i++) {
          palette.push({
            r: readUint8(reader),
            g: readUint8(reader),
            b: readUint8(reader)
          });
        }
        if (reader.view.getUint32(reader.offset) !== 3)
          skipBytes(reader, 4);
      }
      const version2 = readUint32(reader);
      if (version2 !== 3)
        throw new Error(`Invalid pattern VMAL version: ${version2}`);
      readUint32(reader);
      const top = readUint32(reader);
      const left = readUint32(reader);
      const bottom = readUint32(reader);
      const right = readUint32(reader);
      const channelsCount = readUint32(reader);
      const width = right - left;
      const height = bottom - top;
      if (width < 0 || height < 0)
        throw new Error("Invalid pattern bounds");
      if (width > MAX_PATTERN_SIZE || height > MAX_PATTERN_SIZE)
        throw new Error(`Pattern too large (${width}x${height})`);
      if (channelsCount > 64)
        throw new Error(`Invalid pattern channel count: ${channelsCount}`);
      if (width * height > (Math.min(end, reader.view.byteLength) - reader.offset) * 64)
        throw new Error("Pattern data out of bounds");
      const colorChannels = colorMode === 3 ? 3 : colorMode === 4 ? 4 : 1;
      const isCmyk = colorMode === 4;
      const alphaTarget = isCmyk ? 4 : 3;
      const channels = [];
      let maxDecodeSize = 0;
      for (let i = 0, ch = 0; i < channelsCount + 2 && reader.offset + 4 <= end; i++) {
        const has = readUint32(reader);
        if (!has)
          continue;
        const length2 = readUint32(reader);
        if (!length2)
          continue;
        if (length2 < 23)
          throw new Error("Invalid pattern channel length");
        const pixelDepth = readUint32(reader);
        const ctop = readUint32(reader);
        const cleft = readUint32(reader);
        const cbottom = readUint32(reader);
        const cright = readUint32(reader);
        const pixelDepth2 = readUint16(reader);
        const compressionMode = readUint8(reader);
        const cdata = readBytes(reader, length2 - 23);
        const depth = pixelDepth2 === 8 || pixelDepth2 === 16 || pixelDepth2 === 32 ? pixelDepth2 : pixelDepth;
        if (depth !== 8 && depth !== 16 && depth !== 32)
          throw new Error(`Unsupported pattern pixel depth: ${depth}`);
        if (ctop < top || cleft < left || cbottom > bottom || cright > right || cbottom < ctop || cright < cleft) {
          throw new Error("Pattern channel bounds outside of pattern bounds");
        }
        const target = ch < colorChannels ? ch : ch === colorChannels ? alphaTarget : -1;
        ch++;
        if (target === -1)
          continue;
        const w = cright - cleft;
        const h = cbottom - ctop;
        const rowBytes = w * (depth / 8);
        const channelSize = rowBytes * h;
        if (compressionMode === 0) {
          if (cdata.byteLength < channelSize)
            throw new Error("Pattern channel data out of bounds");
        } else if (compressionMode === 1) {
          if (channelSize > cdata.byteLength * 64)
            throw new Error("Pattern channel data out of bounds");
          maxDecodeSize = Math.max(maxDecodeSize, channelSize);
        } else {
          throw new Error("Invalid pattern compression mode");
        }
        channels.push({ target, depth, compressionMode, cdata, ctop, cleft, w, h, rowBytes, channelSize });
      }
      const size = width * height * 4;
      const cmykSize = isCmyk ? width * height * 5 : 0;
      consumeMemory(reader, size + cmykSize + maxDecodeSize);
      recoverMemory(reader, size + cmykSize + maxDecodeSize);
      const data = new Uint8Array(size);
      for (let i = 3; i < data.byteLength; i += 4) {
        data[i] = 255;
      }
      const cmyk = isCmyk ? new Uint8Array(cmykSize).fill(255) : void 0;
      for (const { target, depth, compressionMode, cdata, ctop, cleft, w, h, rowBytes, channelSize } of channels) {
        let bytes = cdata;
        if (compressionMode === 1) {
          bytes = new Uint8Array(channelSize);
          const cdataReader = createReader(cdata.buffer, cdata.byteOffset, cdata.byteLength);
          readDataRLE(cdataReader, { data: bytes, width: rowBytes, height: h }, rowBytes, h, 8, 1, [0], false);
        }
        if (depth !== 8)
          bytes = patternChannelTo8bit(bytes, w * h, depth);
        const ox = cleft - left;
        const oy = ctop - top;
        if (cmyk) {
          copyPatternChannel(bytes, cmyk, w, h, (ox + oy * width) * 5 + target, width * 5, 5);
        } else if (target === 3 || colorMode === 3) {
          copyPatternChannel(bytes, data, w, h, (ox + oy * width) * 4 + target, width * 4, 4);
        } else if (colorMode === 2) {
          const colors = new Uint8Array(256 * 3);
          for (let i = 0; i < 256; i++) {
            colors[i * 3 + 0] = palette[i].r;
            colors[i * 3 + 1] = palette[i].g;
            colors[i * 3 + 2] = palette[i].b;
          }
          for (let y2 = 0; y2 < h; y2++) {
            for (let x2 = 0, src = y2 * w, dst = (ox + (y2 + oy) * width) * 4; x2 < w; x2++, src++, dst += 4) {
              const index = bytes[src] * 3;
              data[dst + 0] = colors[index + 0];
              data[dst + 1] = colors[index + 1];
              data[dst + 2] = colors[index + 2];
            }
          }
        } else {
          for (let y2 = 0; y2 < h; y2++) {
            for (let x2 = 0, src = y2 * w, dst = (ox + (y2 + oy) * width) * 4; x2 < w; x2++, src++, dst += 4) {
              const value = bytes[src];
              data[dst + 0] = value;
              data[dst + 1] = value;
              data[dst + 2] = value;
            }
          }
        }
      }
      if (cmyk) {
        cmykToRgb({ width, height, data: cmyk }, { width, height, data }, false);
      }
      consumeMemory(reader, size);
      reader.offset = end;
      return { id, name, x, y, bounds: { x: left, y: top, w: width, h: height }, data };
    }
    function patternChannelTo8bit(bytes, count, depth) {
      const result = new Uint8Array(count);
      if (depth === 16) {
        for (let i = 0; i < count; i++) {
          result[i] = Math.round((bytes[i * 2] << 8 | bytes[i * 2 + 1]) / 257);
        }
      } else {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (let i = 0; i < count; i++) {
          const value = view.getFloat32(i * 4, false);
          result[i] = value > 0 ? value < 1 ? Math.round(value * 255) : 255 : 0;
        }
      }
      return result;
    }
    function copyPatternChannel(bytes, data, w, h, offset, stride, step) {
      for (let y = 0, src = 0; y < h; y++) {
        for (let x = 0, dst = offset + y * stride; x < w; x++, src++, dst += step) {
          data[dst] = bytes[src];
        }
      }
    }
    function consumeMemory(reader, size) {
      if (!(size >= 0))
        throw new Error("Invalid size");
      if (reader.totalMemoryLimit !== void 0) {
        if (reader.totalMemoryLimit < size)
          throw new Error("Exceeded memory limit");
        reader.totalMemoryLimit -= size;
      }
    }
    function recoverMemory(reader, size) {
      if (reader.totalMemoryLimit !== void 0) {
        reader.totalMemoryLimit += size;
      }
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/effectsHelpers.js
var require_effectsHelpers = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/effectsHelpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readEffects = readEffects;
    exports.writeEffects = writeEffects;
    var helpers_1 = require_helpers();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var bevelStyles = [
      void 0,
      "outer bevel",
      "inner bevel",
      "emboss",
      "pillow emboss",
      "stroke emboss"
    ];
    function readBlendMode(reader) {
      (0, psdReader_1.checkSignature)(reader, "8BIM");
      return helpers_1.toBlendMode[(0, psdReader_1.readSignature)(reader)] || "normal";
    }
    function writeBlendMode(writer, mode) {
      (0, psdWriter_1.writeSignature)(writer, "8BIM");
      (0, psdWriter_1.writeSignature)(writer, helpers_1.fromBlendMode[mode] || "norm");
    }
    function readFixedPoint8(reader) {
      return (0, psdReader_1.readUint8)(reader) / 255;
    }
    function writeFixedPoint8(writer, value) {
      (0, psdWriter_1.writeUint8)(writer, Math.round(value * 255) | 0);
    }
    function readEffects(reader) {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 0)
        throw new Error(`Invalid effects layer version: ${version}`);
      const effectsCount = (0, psdReader_1.readUint16)(reader);
      const effects = {};
      for (let i = 0; i < effectsCount; i++) {
        (0, psdReader_1.checkSignature)(reader, "8BIM");
        const type = (0, psdReader_1.readSignature)(reader);
        switch (type) {
          case "cmnS": {
            const size = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            (0, psdReader_1.readUint8)(reader);
            (0, psdReader_1.skipBytes)(reader, 2);
            if (size !== 7 || version2 !== 0)
              throw new Error(`Invalid effects common state`);
            break;
          }
          case "dsdw":
          // drop shadow (see See Effects layer, drop shadow and inner shadow info)
          case "isdw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 41 && blockSize !== 51)
              throw new Error(`Invalid shadow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid shadow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const angle = (0, psdReader_1.readFixedPoint32)(reader);
            const distance = (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const useGlobalLight = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 51)
              (0, psdReader_1.readColor)(reader);
            const shadowInfo = {
              size: { units: "Pixels", value: size },
              distance: { units: "Pixels", value: distance },
              angle,
              color,
              blendMode,
              enabled,
              useGlobalLight,
              opacity
            };
            if (type === "dsdw") {
              effects.dropShadow = [shadowInfo];
            } else {
              effects.innerShadow = [shadowInfo];
            }
            break;
          }
          case "oglw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 32 && blockSize !== 42)
              throw new Error(`Invalid outer glow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid outer glow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 42)
              (0, psdReader_1.readColor)(reader);
            effects.outerGlow = {
              size: { units: "Pixels", value: size },
              color,
              blendMode,
              enabled,
              opacity
            };
            break;
          }
          case "iglw": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 32 && blockSize !== 43)
              throw new Error(`Invalid inner glow size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid inner glow version: ${version2}`);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            (0, psdReader_1.readFixedPoint32)(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const blendMode = readBlendMode(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const opacity = readFixedPoint8(reader);
            if (blockSize >= 43) {
              (0, psdReader_1.readUint8)(reader);
              (0, psdReader_1.readColor)(reader);
            }
            effects.innerGlow = {
              size: { units: "Pixels", value: size },
              color,
              blendMode,
              enabled,
              opacity
            };
            break;
          }
          case "bevl": {
            const blockSize = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (blockSize !== 58 && blockSize !== 78)
              throw new Error(`Invalid bevel size: ${blockSize}`);
            if (version2 !== 0 && version2 !== 2)
              throw new Error(`Invalid bevel version: ${version2}`);
            const angle = (0, psdReader_1.readFixedPoint32)(reader);
            const strength = (0, psdReader_1.readFixedPoint32)(reader);
            const size = (0, psdReader_1.readFixedPoint32)(reader);
            const highlightBlendMode = readBlendMode(reader);
            const shadowBlendMode = readBlendMode(reader);
            const highlightColor = (0, psdReader_1.readColor)(reader);
            const shadowColor = (0, psdReader_1.readColor)(reader);
            const style = bevelStyles[(0, psdReader_1.readUint8)(reader)] || "inner bevel";
            const highlightOpacity = readFixedPoint8(reader);
            const shadowOpacity = readFixedPoint8(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            const useGlobalLight = !!(0, psdReader_1.readUint8)(reader);
            const direction = (0, psdReader_1.readUint8)(reader) ? "down" : "up";
            if (blockSize >= 78) {
              (0, psdReader_1.readColor)(reader);
              (0, psdReader_1.readColor)(reader);
            }
            effects.bevel = {
              size: { units: "Pixels", value: size },
              angle,
              strength,
              highlightBlendMode,
              shadowBlendMode,
              highlightColor,
              shadowColor,
              style,
              highlightOpacity,
              shadowOpacity,
              enabled,
              useGlobalLight,
              direction
            };
            break;
          }
          case "sofi": {
            const size = (0, psdReader_1.readUint32)(reader);
            const version2 = (0, psdReader_1.readUint32)(reader);
            if (size !== 34)
              throw new Error(`Invalid effects solid fill info size: ${size}`);
            if (version2 !== 2)
              throw new Error(`Invalid effects solid fill info version: ${version2}`);
            const blendMode = readBlendMode(reader);
            const color = (0, psdReader_1.readColor)(reader);
            const opacity = readFixedPoint8(reader);
            const enabled = !!(0, psdReader_1.readUint8)(reader);
            (0, psdReader_1.readColor)(reader);
            effects.solidFill = [{ blendMode, color, opacity, enabled }];
            break;
          }
          default:
            throw new Error(`Invalid effect type: '${type}'`);
        }
      }
      return effects;
    }
    function writeShadowInfo(writer, shadow) {
      var _a;
      (0, psdWriter_1.writeUint32)(writer, 51);
      (0, psdWriter_1.writeUint32)(writer, 2);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.size && shadow.size.value || 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.angle || 0);
      (0, psdWriter_1.writeFixedPoint32)(writer, shadow.distance && shadow.distance.value || 0);
      (0, psdWriter_1.writeColor)(writer, shadow.color);
      writeBlendMode(writer, shadow.blendMode);
      (0, psdWriter_1.writeUint8)(writer, shadow.enabled ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, shadow.useGlobalLight ? 1 : 0);
      writeFixedPoint8(writer, (_a = shadow.opacity) !== null && _a !== void 0 ? _a : 1);
      (0, psdWriter_1.writeColor)(writer, shadow.color);
    }
    function writeEffects(writer, effects) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
      const dropShadow = (_a = effects.dropShadow) === null || _a === void 0 ? void 0 : _a[0];
      const innerShadow = (_b = effects.innerShadow) === null || _b === void 0 ? void 0 : _b[0];
      const outerGlow = effects.outerGlow;
      const innerGlow = effects.innerGlow;
      const bevel = effects.bevel;
      const solidFill = (_c = effects.solidFill) === null || _c === void 0 ? void 0 : _c[0];
      let count = 1;
      if (dropShadow)
        count++;
      if (innerShadow)
        count++;
      if (outerGlow)
        count++;
      if (innerGlow)
        count++;
      if (bevel)
        count++;
      if (solidFill)
        count++;
      (0, psdWriter_1.writeUint16)(writer, 0);
      (0, psdWriter_1.writeUint16)(writer, count);
      (0, psdWriter_1.writeSignature)(writer, "8BIM");
      (0, psdWriter_1.writeSignature)(writer, "cmnS");
      (0, psdWriter_1.writeUint32)(writer, 7);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, psdWriter_1.writeUint8)(writer, 1);
      (0, psdWriter_1.writeZeros)(writer, 2);
      if (dropShadow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "dsdw");
        writeShadowInfo(writer, dropShadow);
      }
      if (innerShadow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "isdw");
        writeShadowInfo(writer, innerShadow);
      }
      if (outerGlow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "oglw");
        (0, psdWriter_1.writeUint32)(writer, 42);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_d = outerGlow.size) === null || _d === void 0 ? void 0 : _d.value) || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, outerGlow.color);
        writeBlendMode(writer, outerGlow.blendMode);
        (0, psdWriter_1.writeUint8)(writer, outerGlow.enabled ? 1 : 0);
        writeFixedPoint8(writer, (_e = outerGlow.opacity) !== null && _e !== void 0 ? _e : 1);
        (0, psdWriter_1.writeColor)(writer, outerGlow.color);
      }
      if (innerGlow) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "iglw");
        (0, psdWriter_1.writeUint32)(writer, 43);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_f = innerGlow.size) === null || _f === void 0 ? void 0 : _f.value) || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, innerGlow.color);
        writeBlendMode(writer, innerGlow.blendMode);
        (0, psdWriter_1.writeUint8)(writer, innerGlow.enabled ? 1 : 0);
        writeFixedPoint8(writer, (_g = innerGlow.opacity) !== null && _g !== void 0 ? _g : 1);
        (0, psdWriter_1.writeUint8)(writer, 0);
        (0, psdWriter_1.writeColor)(writer, innerGlow.color);
      }
      if (bevel) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "bevl");
        (0, psdWriter_1.writeUint32)(writer, 78);
        (0, psdWriter_1.writeUint32)(writer, 2);
        (0, psdWriter_1.writeFixedPoint32)(writer, bevel.angle || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, bevel.strength || 0);
        (0, psdWriter_1.writeFixedPoint32)(writer, ((_h = bevel.size) === null || _h === void 0 ? void 0 : _h.value) || 0);
        writeBlendMode(writer, bevel.highlightBlendMode);
        writeBlendMode(writer, bevel.shadowBlendMode);
        (0, psdWriter_1.writeColor)(writer, bevel.highlightColor);
        (0, psdWriter_1.writeColor)(writer, bevel.shadowColor);
        const style = bevelStyles.indexOf(bevel.style);
        (0, psdWriter_1.writeUint8)(writer, style <= 0 ? bevelStyles.indexOf("inner bevel") : style);
        writeFixedPoint8(writer, (_j = bevel.highlightOpacity) !== null && _j !== void 0 ? _j : 1);
        writeFixedPoint8(writer, (_k = bevel.shadowOpacity) !== null && _k !== void 0 ? _k : 1);
        (0, psdWriter_1.writeUint8)(writer, bevel.enabled ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, bevel.useGlobalLight ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, bevel.direction === "down" ? 1 : 0);
        (0, psdWriter_1.writeColor)(writer, bevel.highlightColor);
        (0, psdWriter_1.writeColor)(writer, bevel.shadowColor);
      }
      if (solidFill) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, "sofi");
        (0, psdWriter_1.writeUint32)(writer, 34);
        (0, psdWriter_1.writeUint32)(writer, 2);
        writeBlendMode(writer, solidFill.blendMode);
        (0, psdWriter_1.writeColor)(writer, solidFill.color);
        writeFixedPoint8(writer, (_l = solidFill.opacity) !== null && _l !== void 0 ? _l : 1);
        (0, psdWriter_1.writeUint8)(writer, solidFill.enabled ? 1 : 0);
        (0, psdWriter_1.writeColor)(writer, solidFill.color);
      }
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/text.js
var require_text = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/text.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeEngineData = decodeEngineData;
    exports.decodeLegacyTextData = decodeLegacyTextData;
    exports.encodeEngineData = encodeEngineData;
    var helpers_1 = require_helpers();
    var defaultFont = {
      name: "MyriadPro-Regular",
      script: 0,
      type: 0,
      synthetic: 0
    };
    var defaultParagraphStyle = {
      justification: "left",
      firstLineIndent: 0,
      startIndent: 0,
      endIndent: 0,
      spaceBefore: 0,
      spaceAfter: 0,
      autoHyphenate: true,
      hyphenatedWordSize: 6,
      preHyphen: 2,
      postHyphen: 2,
      consecutiveHyphens: 8,
      zone: 36,
      wordSpacing: [0.8, 1, 1.33],
      letterSpacing: [0, 0, 0],
      glyphSpacing: [1, 1, 1],
      autoLeading: 1.2,
      leadingType: 0,
      hanging: false,
      burasagari: false,
      kinsokuOrder: 0,
      everyLineComposer: false
    };
    var defaultStyle = {
      font: defaultFont,
      fontSize: 12,
      fauxBold: false,
      fauxItalic: false,
      autoLeading: true,
      leading: 0,
      horizontalScale: 1,
      verticalScale: 1,
      tracking: 0,
      autoKerning: true,
      kerning: 0,
      baselineShift: 0,
      fontCaps: 0,
      fontBaseline: 0,
      underline: false,
      strikethrough: false,
      ligatures: true,
      dLigatures: false,
      baselineDirection: 2,
      tsume: 0,
      styleRunAlignment: 2,
      language: 0,
      noBreak: false,
      fillColor: { r: 0, g: 0, b: 0 },
      strokeColor: { r: 0, g: 0, b: 0 },
      fillFlag: true,
      strokeFlag: false,
      fillFirst: true,
      yUnderline: 1,
      outlineWidth: 1,
      characterDirection: 0,
      hindiNumbers: false,
      kashida: 1,
      diacriticPos: 2
    };
    var defaultGridInfo = {
      isOn: false,
      show: false,
      size: 18,
      leading: 22,
      color: { r: 0, g: 0, b: 255 },
      leadingFillColor: { r: 0, g: 0, b: 255 },
      alignLineHeightToGridFlags: false
    };
    var paragraphStyleKeys = [
      "justification",
      "firstLineIndent",
      "startIndent",
      "endIndent",
      "spaceBefore",
      "spaceAfter",
      "autoHyphenate",
      "hyphenatedWordSize",
      "preHyphen",
      "postHyphen",
      "consecutiveHyphens",
      "zone",
      "wordSpacing",
      "letterSpacing",
      "glyphSpacing",
      "autoLeading",
      "leadingType",
      "hanging",
      "burasagari",
      "kinsokuOrder",
      "everyLineComposer"
    ];
    var styleKeys = [
      "font",
      "fontSize",
      "fauxBold",
      "fauxItalic",
      "autoLeading",
      "leading",
      "horizontalScale",
      "verticalScale",
      "tracking",
      "autoKerning",
      "kerning",
      "baselineShift",
      "fontCaps",
      "fontBaseline",
      "underline",
      "strikethrough",
      "ligatures",
      "dLigatures",
      "baselineDirection",
      "tsume",
      "styleRunAlignment",
      "language",
      "noBreak",
      "fillColor",
      "strokeColor",
      "fillFlag",
      "strokeFlag",
      "fillFirst",
      "yUnderline",
      "outlineWidth",
      "characterDirection",
      "hindiNumbers",
      "kashida",
      "diacriticPos"
    ];
    var antialias = [
      "none",
      // 0
      "crisp",
      // 1
      "strong",
      // 2
      "smooth",
      // 3
      "sharp",
      // 4
      void 0,
      // 5 - unknown
      "platformLCD",
      // 6
      "platform"
      // 7
    ];
    var justification = [
      "left",
      // 0
      "right",
      // 1
      "center",
      // 2
      "justify-left",
      // 3
      "justify-right",
      // 4
      "justify-center",
      // 5
      "justify-all"
      // 6
    ];
    function upperFirst(value) {
      return value.substring(0, 1).toUpperCase() + value.substring(1);
    }
    function decodeColor(color) {
      const c = color.Values;
      switch (color.Type) {
        case 0:
          return { k: c[1] * 255 };
        // grayscale (alpha?)
        case 1:
          return c[0] === 1 ? { r: c[1] * 255, g: c[2] * 255, b: c[3] * 255 } : (
            // rgb
            { r: c[1] * 255, g: c[2] * 255, b: c[3] * 255, a: c[0] * 255 }
          );
        // rgba
        case 2:
          return { c: c[1] * 255, m: c[2] * 255, y: c[3] * 255, k: c[4] * 255 };
        // cmyk (alpha?)
        default:
          throw new Error("Unknown color type in text layer");
      }
    }
    function hsbToRgb(h, s, v) {
      h = (0, helpers_1.clamp)(h || 0, 0, 1);
      s = (0, helpers_1.clamp)(s || 0, 0, 1);
      v = (0, helpers_1.clamp)(v || 0, 0, 1);
      const h6 = h * 6 % 6;
      const i = Math.floor(h6);
      const f = h6 - i;
      const p = v * (1 - s);
      const q = v * (1 - s * f);
      const t = v * (1 - s * (1 - f));
      switch (i) {
        case 0:
          return [v, t, p];
        case 1:
          return [q, v, p];
        case 2:
          return [p, v, t];
        case 3:
          return [p, q, v];
        case 4:
          return [t, p, v];
        default:
          return [v, p, q];
      }
    }
    function encodeColor(color) {
      if (!color) {
        return { Type: 1, Values: [0, 0, 0, 0] };
      } else if ("r" in color) {
        return { Type: 1, Values: ["a" in color ? color.a / 255 : 1, color.r / 255, color.g / 255, color.b / 255] };
      } else if ("fr" in color) {
        return { Type: 1, Values: [1, (0, helpers_1.clamp)(color.fr || 0, 0, 1), (0, helpers_1.clamp)(color.fg || 0, 0, 1), (0, helpers_1.clamp)(color.fb || 0, 0, 1)] };
      } else if ("h" in color) {
        const [r, g, b] = hsbToRgb(color.h, color.s, color.b);
        return { Type: 1, Values: [1, r, g, b] };
      } else if ("c" in color) {
        return { Type: 2, Values: [1, color.c / 255, color.m / 255, color.y / 255, color.k / 255] };
      } else if ("l" in color) {
        throw new Error("LAB colors are not supported in text layers, use RGB, CMYK or grayscale color instead");
      } else if ("k" in color) {
        return { Type: 0, Values: [1, color.k / 255] };
      } else {
        throw new Error("Invalid color type in text layer");
      }
    }
    function arraysEqual(a, b) {
      if (!a || !b)
        return false;
      if (a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i])
          return false;
      return true;
    }
    function objectsEqual(a, b) {
      if (!a || !b)
        return false;
      for (const key of Object.keys(a))
        if (a[key] !== b[key])
          return false;
      for (const key of Object.keys(b))
        if (a[key] !== b[key])
          return false;
      return true;
    }
    function findOrAddFont(fonts, font) {
      for (let i = 0; i < fonts.length; i++) {
        if (fonts[i].name === font.name && (fonts[i].synthetic || 0) === (font.synthetic || 0))
          return i;
      }
      fonts.push(font);
      return fonts.length - 1;
    }
    function decodeObject(obj, keys, fonts) {
      var _a;
      const result = {};
      for (const key of keys) {
        const Key = upperFirst(key);
        if (obj[Key] === void 0)
          continue;
        if (key === "justification") {
          result[key] = (_a = justification[obj[Key] | 0]) !== null && _a !== void 0 ? _a : "left";
        } else if (key === "font") {
          const font = fonts[obj[Key] | 0];
          if (font)
            result[key] = font;
        } else if (key === "fillColor" || key === "strokeColor") {
          result[key] = decodeColor(obj[Key]);
        } else {
          result[key] = obj[Key];
        }
      }
      return result;
    }
    function encodeObject(obj, keys, fonts) {
      var _a;
      const result = {};
      for (const key of keys) {
        const Key = upperFirst(key);
        if (obj[key] === void 0)
          continue;
        if (key === "justification") {
          result[Key] = Math.max(0, justification.indexOf((_a = obj[key]) !== null && _a !== void 0 ? _a : "left"));
        } else if (key === "font") {
          result[Key] = findOrAddFont(fonts, obj[key]);
        } else if (key === "fillColor" || key === "strokeColor") {
          result[Key] = encodeColor(obj[key]);
        } else {
          result[Key] = obj[key];
        }
      }
      return result;
    }
    function decodeParagraphStyle(obj, fonts) {
      return decodeObject(obj, paragraphStyleKeys, fonts);
    }
    function decodeStyle(obj, fonts) {
      return decodeObject(obj, styleKeys, fonts);
    }
    function encodeParagraphStyle(obj, fonts) {
      return encodeObject(obj, paragraphStyleKeys, fonts);
    }
    function encodeStyle(obj, fonts) {
      return encodeObject(obj, styleKeys, fonts);
    }
    function deduplicateValues(base, runs, keys) {
      if (!runs.length)
        return;
      for (const key of keys) {
        const value = runs[0].style[key];
        if (value !== void 0) {
          let identical = false;
          if (Array.isArray(value)) {
            identical = runs.every((r) => arraysEqual(r.style[key], value));
          } else if (typeof value === "object") {
            identical = runs.every((r) => objectsEqual(r.style[key], value));
          } else {
            identical = runs.every((r) => r.style[key] === value);
          }
          if (identical) {
            base[key] = value;
          }
        }
        const styleValue = base[key];
        if (styleValue !== void 0) {
          for (const r of runs) {
            let same = false;
            if (Array.isArray(value)) {
              same = arraysEqual(r.style[key], value);
            } else if (typeof value === "object") {
              same = objectsEqual(r.style[key], value);
            } else {
              same = r.style[key] === value;
            }
            if (same)
              delete r.style[key];
          }
        }
      }
      if (runs.every((x) => Object.keys(x.style).length === 0)) {
        runs.length = 0;
      }
    }
    function isDefaultGridColor(color) {
      return !!color && "r" in color && color.r === 0 && color.g === 0 && color.b === 255;
    }
    function decodeGridColor(color, defaultColor) {
      try {
        return color ? decodeColor(color) : defaultColor;
      } catch (_a) {
        return defaultColor;
      }
    }
    function decodeGridInfo(grid) {
      var _a, _b;
      if (!grid || typeof grid !== "object")
        return void 0;
      const result = {
        isOn: !!grid.GridIsOn,
        show: !!grid.ShowGrid,
        size: (_a = grid.GridSize) !== null && _a !== void 0 ? _a : defaultGridInfo.size,
        leading: (_b = grid.GridLeading) !== null && _b !== void 0 ? _b : defaultGridInfo.leading,
        color: decodeGridColor(grid.GridColor, defaultGridInfo.color),
        leadingFillColor: decodeGridColor(grid.GridLeadingFillColor, defaultGridInfo.leadingFillColor),
        alignLineHeightToGridFlags: !!grid.AlignLineHeightToGridFlags
      };
      const isDefault = !result.isOn && !result.show && result.size === defaultGridInfo.size && result.leading === defaultGridInfo.leading && !result.alignLineHeightToGridFlags && isDefaultGridColor(result.color) && isDefaultGridColor(result.leadingFillColor);
      return isDefault ? void 0 : result;
    }
    function decodeEngineData(engineData) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      const engineDict = engineData.EngineDict;
      const resourceDict = engineData.ResourceDict;
      const fonts = resourceDict.FontSet.map((f) => ({
        name: f.Name,
        script: f.Script,
        type: f.FontType,
        synthetic: f.Synthetic
      }));
      let text = engineDict.Editor.Text.replace(/\r/g, "\n");
      let removedCharacters = 0;
      if (/\n$/.test(text)) {
        text = text.substring(0, text.length - 1);
        removedCharacters = 1;
      }
      const result = {
        text,
        antiAlias: (_a = antialias[engineDict.AntiAlias]) !== null && _a !== void 0 ? _a : "smooth",
        useFractionalGlyphWidths: !!engineDict.UseFractionalGlyphWidths,
        superscriptSize: resourceDict.SuperscriptSize,
        superscriptPosition: resourceDict.SuperscriptPosition,
        subscriptSize: resourceDict.SubscriptSize,
        subscriptPosition: resourceDict.SubscriptPosition,
        smallCapSize: resourceDict.SmallCapSize
      };
      const photoshop = (_f = (_e = (_d = (_c = (_b = engineDict.Rendered) === null || _b === void 0 ? void 0 : _b.Shapes) === null || _c === void 0 ? void 0 : _c.Children) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.Cookie) === null || _f === void 0 ? void 0 : _f.Photoshop;
      if (photoshop) {
        result.shapeType = photoshop.ShapeType === 1 ? "box" : "point";
        if (photoshop.PointBase)
          result.pointBase = photoshop.PointBase;
        if (photoshop.BoxBounds)
          result.boxBounds = photoshop.BoxBounds;
      }
      const gridInfo = decodeGridInfo(engineDict.GridInfo);
      if (gridInfo)
        result.gridInfo = gridInfo;
      const paragraphRun = engineDict.ParagraphRun;
      result.paragraphStyle = {};
      result.paragraphStyleRuns = [];
      for (let i = 0; i < paragraphRun.RunArray.length; i++) {
        const run = paragraphRun.RunArray[i];
        const length = paragraphRun.RunLengthArray[i];
        const style = decodeParagraphStyle(run.ParagraphSheet.Properties, fonts);
        result.paragraphStyleRuns.push({
          length,
          style
          /*, adjustments*/
        });
      }
      for (let counter = removedCharacters; result.paragraphStyleRuns.length && counter > 0; counter--) {
        if (--result.paragraphStyleRuns[result.paragraphStyleRuns.length - 1].length === 0 && result.paragraphStyleRuns.length === 1) {
          result.paragraphStyleRuns.pop();
        }
      }
      deduplicateValues(result.paragraphStyle, result.paragraphStyleRuns, paragraphStyleKeys);
      if (!result.paragraphStyleRuns.length)
        delete result.paragraphStyleRuns;
      const styleRun = engineDict.StyleRun;
      const normalStyleSheet = (_j = (_g = resourceDict.StyleSheetSet) === null || _g === void 0 ? void 0 : _g[(_h = resourceDict.TheNormalStyleSheet) !== null && _h !== void 0 ? _h : 0]) === null || _j === void 0 ? void 0 : _j.StyleSheetData;
      const normalFontIndex = normalStyleSheet === null || normalStyleSheet === void 0 ? void 0 : normalStyleSheet.Font;
      const normalFont = (_k = normalFontIndex !== void 0 ? fonts[normalFontIndex] : void 0) !== null && _k !== void 0 ? _k : fonts[0];
      result.style = {};
      result.styleRuns = [];
      for (let i = 0; i < styleRun.RunArray.length; i++) {
        const length = styleRun.RunLengthArray[i];
        const style = decodeStyle(styleRun.RunArray[i].StyleSheet.StyleSheetData, fonts);
        if (!style.font && normalFont)
          style.font = normalFont;
        result.styleRuns.push({ length, style });
      }
      for (let counter = removedCharacters; result.styleRuns.length && counter > 0; counter--) {
        if (--result.styleRuns[result.styleRuns.length - 1].length === 0) {
          result.styleRuns.pop();
        }
      }
      deduplicateValues(result.style, result.styleRuns, styleKeys);
      if (!result.styleRuns.length)
        delete result.styleRuns;
      return result;
    }
    var fixed = (value) => value / 65536;
    function decodeLegacyTextData(data) {
      var _a, _b, _c, _d;
      const styleRuns = [];
      let text = "";
      for (const line of data.lines) {
        for (const { code, style } of line.chars) {
          text += String.fromCharCode(code);
          const last = styleRuns[styleRuns.length - 1];
          if (last && last.mark === style) {
            last.length++;
          } else {
            styleRuns.push({ length: 1, mark: style });
          }
        }
      }
      if (text.endsWith("\r")) {
        text = text.slice(0, -1);
        if (--styleRuns[styleRuns.length - 1].length === 0)
          styleRuns.pop();
      }
      const runs = styleRuns.map(({ length, mark }) => {
        var _a2, _b2;
        const s = (_a2 = data.styles.find((s2) => s2.mark === mark)) !== null && _a2 !== void 0 ? _a2 : data.styles[0];
        const face = s && ((_b2 = data.faces.find((f) => f.mark === s.faceMark)) !== null && _b2 !== void 0 ? _b2 : data.faces[0]);
        const style = {};
        if (face)
          style.font = { name: face.name, script: face.script };
        if (s) {
          style.fontSize = fixed(s.size);
          style.autoLeading = s.leading === 0;
          if (s.leading)
            style.leading = fixed(s.leading);
          style.tracking = Math.round(fixed(s.tracking) * 1e3);
          style.autoKerning = s.autoKerning;
          style.kerning = Math.round(fixed(s.kerning) * 1e3);
          style.baselineShift = fixed(s.baselineShift);
        }
        style.fillColor = data.color;
        return { length, style };
      });
      const result = {
        text: text.replace(/\r/g, "\n"),
        transform: data.transform,
        antiAlias: data.antiAlias ? "smooth" : "none",
        orientation: ((_a = data.lines[0]) === null || _a === void 0 ? void 0 : _a.orientation) === 1 ? "vertical" : "horizontal",
        paragraphStyle: { justification: (_d = justification[((_c = (_b = data.lines[0]) === null || _b === void 0 ? void 0 : _b.alignment) !== null && _c !== void 0 ? _c : 0) | 0]) !== null && _d !== void 0 ? _d : "left" },
        style: {},
        styleRuns: runs
      };
      deduplicateValues(result.style, result.styleRuns, styleKeys);
      if (!result.styleRuns.length)
        delete result.styleRuns;
      return result;
    }
    function adjustRunLengths(runs, removed) {
      if (!runs || !removed.length)
        return runs;
      let start = 0;
      let removedIndex = 0;
      return runs.map((run) => {
        const length = Math.max(0, run.length || 0);
        const end = start + length;
        let count = 0;
        while (removedIndex < removed.length && removed[removedIndex] < end) {
          if (removed[removedIndex] >= start)
            count++;
          removedIndex++;
        }
        start = end;
        return Object.assign(Object.assign({}, run), { length: length - count });
      });
    }
    function encodeEngineData(data) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
      const sourceText = data.text || "";
      const removedIndices = [];
      for (let i = 0; i < sourceText.length - 1; i++) {
        if (sourceText.charCodeAt(i) === 13 && sourceText.charCodeAt(i + 1) === 10)
          removedIndices.push(i);
      }
      const text = `${sourceText.replace(/\r?\n/g, "\r")}\r`;
      const fonts = [
        { name: "AdobeInvisFont", script: 0, type: 0, synthetic: 0 }
      ];
      const defFont = ((_a = data.style) === null || _a === void 0 ? void 0 : _a.font) || ((_c = (_b = data.styleRuns) === null || _b === void 0 ? void 0 : _b.find((s) => s.style.font)) === null || _c === void 0 ? void 0 : _c.style.font) || defaultFont;
      const paragraphRunArray = [];
      const paragraphRunLengthArray = [];
      const paragraphRuns = adjustRunLengths(data.paragraphStyleRuns, removedIndices);
      if (paragraphRuns && paragraphRuns.length) {
        let leftLength2 = text.length;
        for (const run of paragraphRuns) {
          let runLength = Math.min(run.length, leftLength2);
          leftLength2 -= runLength;
          if (leftLength2 === 1 && run === paragraphRuns[paragraphRuns.length - 1]) {
            runLength++;
            leftLength2--;
          }
          if (!runLength)
            continue;
          paragraphRunLengthArray.push(runLength);
          paragraphRunArray.push({
            ParagraphSheet: {
              DefaultStyleSheet: 0,
              Properties: encodeParagraphStyle(Object.assign(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), run.style), fonts)
            },
            Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
          });
        }
        if (leftLength2) {
          paragraphRunLengthArray.push(leftLength2);
          paragraphRunArray.push({
            ParagraphSheet: {
              DefaultStyleSheet: 0,
              Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
            },
            Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
          });
        }
      } else {
        for (let i = 0, last = 0; i < text.length; i++) {
          if (text.charCodeAt(i) === 13) {
            paragraphRunLengthArray.push(i - last + 1);
            paragraphRunArray.push({
              ParagraphSheet: {
                DefaultStyleSheet: 0,
                Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
              },
              Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
            });
            last = i + 1;
          }
        }
      }
      const styleSheetData = encodeStyle(Object.assign(Object.assign({}, defaultStyle), { font: defFont }), fonts);
      const styleRuns = ((_d = data.styleRuns) === null || _d === void 0 ? void 0 : _d.length) ? adjustRunLengths(data.styleRuns, removedIndices) : [{ length: text.length, style: data.style || {} }];
      const styleRunArray = [];
      const styleRunLengthArray = [];
      let leftLength = text.length;
      for (const run of styleRuns) {
        let runLength = Math.min(run.length, leftLength);
        leftLength -= runLength;
        if (!runLength)
          continue;
        if (leftLength === 1 && run === styleRuns[styleRuns.length - 1]) {
          runLength++;
          leftLength--;
        }
        styleRunLengthArray.push(runLength);
        styleRunArray.push({
          StyleSheet: {
            StyleSheetData: encodeStyle(Object.assign(Object.assign({ kerning: 0, autoKerning: true, fillColor: { r: 0, g: 0, b: 0 } }, data.style), run.style), fonts)
          }
        });
      }
      if (leftLength) {
        styleRunLengthArray.push(leftLength);
        styleRunArray.push({
          StyleSheet: {
            StyleSheetData: encodeStyle(Object.assign({ kerning: 0, autoKerning: true, fillColor: { r: 0, g: 0, b: 0 } }, data.style), fonts)
          }
        });
      }
      const gridInfo = Object.assign(Object.assign({}, defaultGridInfo), data.gridInfo);
      const antiAliasIndex = antialias.indexOf((_e = data.antiAlias) !== null && _e !== void 0 ? _e : "sharp");
      const WritingDirection = data.orientation === "vertical" ? 2 : 0;
      const Procession = data.orientation === "vertical" ? 1 : 0;
      const ShapeType = data.shapeType === "box" ? 1 : 0;
      const Photoshop = {
        ShapeType
      };
      if (ShapeType === 0) {
        Photoshop.PointBase = data.pointBase || [0, 0];
      } else {
        Photoshop.BoxBounds = data.boxBounds || [0, 0, 0, 0];
      }
      Photoshop.Base = {
        ShapeType,
        TransformPoint0: [1, 0],
        TransformPoint1: [0, 1],
        TransformPoint2: [0, 0]
      };
      const defaultResources = {
        KinsokuSet: [
          {
            Name: "PhotoshopKinsokuHard",
            NoStart: "\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF1F\uFF01\u30FC\u2015\u2019\u201D\uFF09\u3015\uFF3D\uFF5D\u3009\u300B\u300D\u300F\u3011\u30FD\u30FE\u309D\u309E\u3005\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6\u309B\u309C?!)]},.:;\u2103\u2109\xA2\uFF05\u2030",
            NoEnd: "\u2018\u201C\uFF08\u3014\uFF3B\uFF5B\u3008\u300A\u300C\u300E\u3010([{\uFFE5\uFF04\xA3\uFF20\xA7\u3012\uFF03",
            Keep: "\u2015\u2025",
            Hanging: "\u3001\u3002.,"
          },
          {
            Name: "PhotoshopKinsokuSoft",
            NoStart: "\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF1F\uFF01\u2019\u201D\uFF09\u3015\uFF3D\uFF5D\u3009\u300B\u300D\u300F\u3011\u30FD\u30FE\u309D\u309E\u3005",
            NoEnd: "\u2018\u201C\uFF08\u3014\uFF3B\uFF5B\u3008\u300A\u300C\u300E\u3010",
            Keep: "\u2015\u2025",
            Hanging: "\u3001\u3002.,"
          }
        ],
        MojiKumiSet: [
          { InternalName: "Photoshop6MojiKumiSet1" },
          { InternalName: "Photoshop6MojiKumiSet2" },
          { InternalName: "Photoshop6MojiKumiSet3" },
          { InternalName: "Photoshop6MojiKumiSet4" }
        ],
        TheNormalStyleSheet: 0,
        TheNormalParagraphSheet: 0,
        ParagraphSheetSet: [
          {
            Name: "Normal RGB",
            DefaultStyleSheet: 0,
            Properties: encodeParagraphStyle(Object.assign(Object.assign({}, defaultParagraphStyle), data.paragraphStyle), fonts)
          }
        ],
        StyleSheetSet: [
          {
            Name: "Normal RGB",
            StyleSheetData: styleSheetData
          }
        ],
        FontSet: fonts.map((f) => ({
          Name: f.name,
          Script: f.script || 0,
          FontType: f.type || 0,
          Synthetic: f.synthetic || 0
        })),
        SuperscriptSize: (_f = data.superscriptSize) !== null && _f !== void 0 ? _f : 0.583,
        SuperscriptPosition: (_g = data.superscriptPosition) !== null && _g !== void 0 ? _g : 0.333,
        SubscriptSize: (_h = data.subscriptSize) !== null && _h !== void 0 ? _h : 0.583,
        SubscriptPosition: (_j = data.subscriptPosition) !== null && _j !== void 0 ? _j : 0.333,
        SmallCapSize: (_k = data.smallCapSize) !== null && _k !== void 0 ? _k : 0.7
      };
      const engineData = {
        EngineDict: {
          Editor: { Text: text },
          ParagraphRun: {
            DefaultRunData: {
              ParagraphSheet: { DefaultStyleSheet: 0, Properties: {} },
              Adjustments: { Axis: [1, 0, 1], XY: [0, 0] }
            },
            RunArray: paragraphRunArray,
            RunLengthArray: paragraphRunLengthArray,
            IsJoinable: 1
          },
          StyleRun: {
            DefaultRunData: { StyleSheet: { StyleSheetData: {} } },
            RunArray: styleRunArray,
            RunLengthArray: styleRunLengthArray,
            IsJoinable: 2
          },
          GridInfo: {
            GridIsOn: !!gridInfo.isOn,
            ShowGrid: !!gridInfo.show,
            GridSize: (_l = gridInfo.size) !== null && _l !== void 0 ? _l : 18,
            GridLeading: (_m = gridInfo.leading) !== null && _m !== void 0 ? _m : 22,
            GridColor: encodeColor(gridInfo.color),
            GridLeadingFillColor: encodeColor(gridInfo.leadingFillColor),
            AlignLineHeightToGridFlags: !!gridInfo.alignLineHeightToGridFlags
          },
          AntiAlias: antiAliasIndex === -1 ? antialias.indexOf("sharp") : antiAliasIndex,
          UseFractionalGlyphWidths: (_o = data.useFractionalGlyphWidths) !== null && _o !== void 0 ? _o : true,
          Rendered: {
            Version: 1,
            Shapes: {
              WritingDirection,
              Children: [
                {
                  ShapeType,
                  Procession,
                  Lines: { WritingDirection, Children: [] },
                  Cookie: { Photoshop }
                }
              ]
            }
          }
        },
        ResourceDict: Object.assign({}, defaultResources),
        DocumentResources: Object.assign({}, defaultResources)
      };
      return engineData;
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/engineData2.js
var require_engineData2 = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/engineData2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeEngineData2 = decodeEngineData2;
    var engineData_1 = require_engineData();
    var keysColor = {
      "0": {
        uproot: true,
        children: {
          "0": { name: "Type" },
          "1": { name: "Values" }
        }
      }
    };
    var keysStyleSheet = {
      "0": { name: "Font" },
      "1": { name: "FontSize" },
      "2": { name: "FauxBold" },
      "3": { name: "FauxItalic" },
      "4": { name: "AutoLeading" },
      "5": { name: "Leading" },
      "6": { name: "HorizontalScale" },
      "7": { name: "VerticalScale" },
      "8": { name: "Tracking" },
      "9": { name: "BaselineShift" },
      // '10': ???
      "11": { name: "Kerning?" },
      // different value than EngineData (0 - numerical value, 1 - metric, 2 - optical)
      "12": { name: "FontCaps" },
      "13": { name: "FontBaseline" },
      "15": { name: "Strikethrough?" },
      // number instead of bool
      "16": { name: "Underline?" },
      // number instead of bool
      "18": { name: "Ligatures" },
      "19": { name: "DLigatures" },
      // '20': ???
      // '21': ???
      // '22': ???
      "23": { name: "Fractions" },
      // not present in EngineData
      "24": { name: "Ordinals" },
      // not present in EngineData
      // '25': ???
      // '26': ???
      // '27': ???
      "28": { name: "StylisticAlternates" },
      // not present in EngineData
      // '29': ???
      "30": { name: "OldStyle?" },
      // OpenType > OldStyle, number instead of bool, not present in EngineData
      "35": { name: "BaselineDirection" },
      "38": { name: "Language" },
      "52": { name: "NoBreak" },
      "53": { name: "FillColor", children: keysColor },
      "54": { name: "StrokeColor", children: keysColor },
      "55": { children: { "99": { uproot: true } } },
      // '68': ???
      // '70': ???
      // '71': ???
      // '72': ???
      // '73': ???
      "79": { children: keysColor }
      // '85': ???
      // '87': ???
      // '88': ???
    };
    var keysParagraph = {
      "0": { name: "Justification" },
      "1": { name: "FirstLineIndent" },
      "2": { name: "StartIndent" },
      "3": { name: "EndIndent" },
      "4": { name: "SpaceBefore" },
      "5": { name: "SpaceAfter" },
      "7": { name: "AutoLeading" },
      "9": { name: "AutoHyphenate" },
      "10": { name: "HyphenatedWordSize" },
      "11": { name: "PreHyphen" },
      "12": { name: "PostHyphen" },
      "13": { name: "ConsecutiveHyphens?" },
      // different value than EngineData
      "14": { name: "Zone" },
      "15": { name: "HypenateCapitalizedWords" },
      // not present in EngineData
      "17": { name: "WordSpacing" },
      "18": { name: "LetterSpacing" },
      "19": { name: "GlyphSpacing" },
      "32": { name: "StyleSheet", children: keysStyleSheet }
    };
    var keysStyleSheetData = {
      name: "StyleSheetData",
      children: keysStyleSheet
    };
    var keysRoot = {
      "0": {
        name: "ResourceDict",
        children: {
          "1": {
            name: "FontSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": {
                        uproot: true,
                        children: {
                          "0": { name: "Name" },
                          "2": { name: "FontType" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "2": {
            name: "2",
            children: {}
          },
          "3": {
            name: "MojiKumiSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "InternalName" }
                    }
                  }
                }
              }
            }
          },
          "4": {
            name: "KinsokuSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "5": {
                        uproot: true,
                        children: {
                          "0": { name: "NoStart" },
                          "1": { name: "NoEnd" },
                          "2": { name: "Keep" },
                          "3": { name: "Hanging" },
                          "4": { name: "Name" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "5": {
            name: "StyleSheetSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "6": keysStyleSheetData
                    }
                  }
                }
              }
            }
          },
          "6": {
            name: "ParagraphSheetSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    uproot: true,
                    children: {
                      "0": { name: "Name" },
                      "5": {
                        name: "Properties",
                        children: keysParagraph
                      },
                      "6": { name: "DefaultStyleSheet" }
                    }
                  }
                }
              }
            }
          },
          "8": {
            name: "TextFrameSet",
            children: {
              "0": {
                uproot: true,
                children: {
                  "0": {
                    name: "path",
                    children: {
                      "0": { name: "name" },
                      "1": {
                        name: "bezierCurve",
                        children: {
                          "0": { name: "controlPoints" }
                        }
                      },
                      "2": {
                        name: "data",
                        children: {
                          "0": { name: "type" },
                          "1": { name: "orientation" },
                          "2": { name: "frameMatrix" },
                          "4": { name: "4" },
                          "6": { name: "textRange" },
                          "7": { name: "rowGutter" },
                          "8": { name: "columnGutter" },
                          "9": { name: "9" },
                          "10": {
                            name: "baselineAlignment",
                            children: {
                              "0": { name: "flag" },
                              "1": { name: "min" }
                            }
                          },
                          "11": {
                            name: "pathData",
                            children: {
                              "1": { name: "1" },
                              "0": { name: "reversed" },
                              "2": { name: "2" },
                              "3": { name: "3" },
                              "4": { name: "spacing" },
                              "5": { name: "5" },
                              "6": { name: "6" },
                              "7": { name: "7" },
                              "18": { name: "18" }
                            }
                          },
                          "12": { name: "12" },
                          "13": { name: "13" }
                        }
                      },
                      "3": { name: "3" },
                      "97": { name: "uuid" }
                    }
                  }
                }
              }
            }
          },
          "9": {
            name: "Predefined",
            children: {
              "0": {
                children: { "0": { uproot: true } }
              },
              "1": {
                children: { "0": { uproot: true } }
              }
            }
          }
        }
      },
      "1": {
        name: "EngineDict",
        children: {
          "0": {
            name: "0",
            children: {
              // 0: ???
              // 1: ???
              // 2: ???
              "3": { name: "SuperscriptSize" },
              "4": { name: "SuperscriptPosition" },
              "5": { name: "SubscriptSize" },
              "6": { name: "SubscriptPosition" },
              "7": { name: "SmallCapSize" },
              "8": { name: "UseFractionalGlyphWidths" },
              // ???
              "15": { children: { "0": { uproot: true } } }
              // 16: ???
              // 17: ???
            }
          },
          "1": {
            name: "Editors?",
            // layer.text.index is specifying the index of the editor related to the layer
            children: {
              "0": {
                name: "Editor",
                children: {
                  "0": { name: "Text" },
                  "5": {
                    name: "ParagraphRun",
                    children: {
                      "0": {
                        name: "RunArray",
                        children: {
                          "0": {
                            name: "ParagraphSheet",
                            children: {
                              "0": {
                                uproot: true,
                                children: {
                                  "0": { name: "0" },
                                  "5": {
                                    name: "5",
                                    children: keysParagraph
                                  },
                                  "6": { name: "6" }
                                }
                              }
                            }
                          },
                          "1": { name: "RunLength" }
                        }
                      }
                    }
                  },
                  "6": {
                    name: "StyleRun",
                    children: {
                      "0": {
                        name: "RunArray",
                        children: {
                          "0": {
                            name: "StyleSheet",
                            children: {
                              "0": {
                                uproot: true,
                                children: {
                                  "6": keysStyleSheetData
                                }
                              }
                            }
                          },
                          "1": { name: "RunLength" }
                        }
                      }
                    }
                  }
                }
              },
              "1": {
                name: "FontVectorData ???"
                // children: {
                // 	'0': {},
                // 	'2': {
                // 		// '5'
                // 		// '6'
                // 	},
                // }
                //     "1": [ // this is probably bounding box? there seem to be many of them nested
                //       0,
                //       0,
                //       999,
                //       176.30014
                //     ],
                // various types: /PC, /F, /R, /L, /S, /G
              }
            }
          },
          "2": {
            name: "StyleSheet",
            children: keysStyleSheet
          },
          "3": {
            name: "ParagraphSheet",
            children: keysParagraph
          }
        }
      }
    };
    var MAX_DEPTH = 256;
    function getKey(keys, key) {
      return Object.prototype.hasOwnProperty.call(keys, key) ? keys[key] : void 0;
    }
    function decodeObj(obj, keys, depth) {
      var _a, _b;
      if (depth > MAX_DEPTH)
        throw new Error(`Engine data is nested too deeply (more than ${MAX_DEPTH} levels)`);
      if (obj === null || obj === void 0)
        return obj;
      if (Array.isArray(obj))
        return obj.map((x) => decodeObj(x, keys, depth + 1));
      if (typeof obj !== "object")
        return obj;
      const objKeys = Object.keys(obj);
      const uprootKey = objKeys.find((key) => {
        var _a2;
        return key !== "99" && ((_a2 = getKey(keys, key)) === null || _a2 === void 0 ? void 0 : _a2.uproot);
      });
      let result;
      if (uprootKey !== void 0) {
        result = decodeObj(obj[uprootKey], (_a = getKey(keys, uprootKey).children) !== null && _a !== void 0 ? _a : {}, depth + 1);
        if (result === null || typeof result !== "object")
          return result;
        if (obj["99"])
          result._type = obj["99"];
        if (Array.isArray(result))
          return result;
      } else {
        result = {};
      }
      for (const key of objKeys) {
        if (key === uprootKey)
          continue;
        const info = getKey(keys, key);
        if (key === "99") {
          if (uprootKey === void 0)
            result._type = obj[key];
        } else {
          const name = (info === null || info === void 0 ? void 0 : info.name) || key;
          if (uprootKey === void 0 || !(name in result)) {
            (0, engineData_1.setProperty)(result, name, decodeObj(obj[key], (_b = info === null || info === void 0 ? void 0 : info.children) !== null && _b !== void 0 ? _b : {}, depth + 1));
          }
        }
      }
      return result;
    }
    function emptyResourceDict() {
      return { FontSet: [], StyleSheetSet: [], ParagraphSheetSet: [] };
    }
    function decodeEngineData2(data) {
      const result = decodeObj(data, keysRoot, 0);
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        return { ResourceDict: emptyResourceDict(), EngineDict: {} };
      }
      if (!result.ResourceDict || typeof result.ResourceDict !== "object") {
        result.ResourceDict = emptyResourceDict();
      }
      return result;
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/additionalInfo.js
var require_additionalInfo = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/additionalInfo.js"(exports) {
    "use strict";
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.booleanOperations = exports.infoHandlersMap = exports.infoHandlers = void 0;
    exports.readBezierKnot = readBezierKnot;
    exports.readVectorMask = readVectorMask;
    exports.writeVectorMask = writeVectorMask;
    exports.parseKeyDescriptorList = parseKeyDescriptorList;
    exports.serializeKeyDescriptorList = serializeKeyDescriptorList;
    exports.hasMultiEffects = hasMultiEffects;
    var base64_js_1 = require_base64_js();
    var effectsHelpers_1 = require_effectsHelpers();
    var helpers_1 = require_helpers();
    var psdReader_1 = require_psdReader();
    var psdWriter_1 = require_psdWriter();
    var descriptor_1 = require_descriptor();
    var engineData_1 = require_engineData();
    var text_1 = require_text();
    var engineData2_1 = require_engineData2();
    var fromAtoZ = "abcdefghijklmnopqrstuvwxyz";
    exports.infoHandlers = [];
    exports.infoHandlersMap = {};
    function addHandler(key, has, read, write) {
      const handler = { key, has, read, write };
      exports.infoHandlers.push(handler);
      exports.infoHandlersMap[handler.key] = handler;
    }
    function addHandlerAlias(key, target) {
      exports.infoHandlersMap[key] = exports.infoHandlersMap[target];
    }
    function hasKey(key) {
      return (target) => target[key] !== void 0;
    }
    function readLength64(reader) {
      if ((0, psdReader_1.readUint32)(reader))
        throw new Error(`Resource size above 4 GB limit at ${reader.offset.toString(16)}`);
      return (0, psdReader_1.readUint32)(reader);
    }
    addHandler("TySh", hasKey("text"), (reader, target, leftBytes) => {
      var _a;
      if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh version`);
      const transform = [];
      for (let i = 0; i < 6; i++)
        transform.push((0, psdReader_1.readFloat64)(reader));
      if ((0, psdReader_1.readInt16)(reader) !== 50)
        throw new Error(`Invalid TySh text version`);
      const text = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh warp version`);
      const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.text = {
        transform,
        left: (0, psdReader_1.readFloat32)(reader),
        top: (0, psdReader_1.readFloat32)(reader),
        right: (0, psdReader_1.readFloat32)(reader),
        bottom: (0, psdReader_1.readFloat32)(reader),
        text: text["Txt "].replace(/\r/g, "\n"),
        index: text.TextIndex || 0,
        gridding: descriptor_1.textGridding.decode(text.textGridding),
        antiAlias: descriptor_1.Annt.decode(text.AntA),
        orientation: descriptor_1.Ornt.decode(text.Ornt),
        warp: {
          style: descriptor_1.warpStyle.decode(warp.warpStyle),
          value: warp.warpValue || 0,
          perspective: warp.warpPerspective || 0,
          perspectiveOther: warp.warpPerspectiveOther || 0,
          rotate: descriptor_1.Ornt.decode(warp.warpRotate)
        }
      };
      if (text.bounds)
        target.text.bounds = (0, descriptor_1.descBoundsToBounds)(text.bounds);
      if (text.boundingBox)
        target.text.boundingBox = (0, descriptor_1.descBoundsToBounds)(text.boundingBox);
      if (text.substitutesUsed !== void 0)
        target.text.substitutesUsed = text.substitutesUsed;
      if (text.TxtC)
        target.text.clickPoint = (0, descriptor_1.horzVrtcToXY)(text.TxtC);
      if (text.TxPT !== void 0 || text.TxPR !== void 0 || text.TxMP !== void 0) {
        target.text.textOnPath = {};
        if (text.TxPT !== void 0)
          target.text.textOnPath.type = text.TxPT.split(".")[1];
        if (text.TxPR !== void 0)
          target.text.textOnPath.direction = text.TxPR.split(".")[1];
        if (text.TxMP !== void 0)
          target.text.textOnPath.mirror = text.TxMP;
      }
      if (text.VAlign !== void 0)
        target.text.verticalAlignment = text.VAlign;
      if (text.EngineData) {
        const engineData = (0, engineData_1.parseEngineData)(text.EngineData, reader);
        const textData = (0, text_1.decodeEngineData)(engineData);
        target.text = Object.assign(Object.assign(Object.assign({}, target.text), textData), { antiAlias: (_a = target.text.antiAlias) !== null && _a !== void 0 ? _a : textData.antiAlias });
      }
      (0, psdReader_1.skipBytes)(reader, leftBytes());
    }, (writer, target) => {
      var _a, _b, _c, _d, _e, _f, _g;
      const text = target.text;
      const warp = text.warp || {};
      const transform = text.transform || [1, 0, 0, 1, 0, 0];
      const textDescriptor = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ "Txt ": (text.text || "").replace(/\r?\n/g, "\r") }, text.clickPoint ? { TxtC: (0, descriptor_1.xyToHorzVrtc)(text.clickPoint) } : {}), text.substitutesUsed !== void 0 ? { substitutesUsed: !!text.substitutesUsed } : {}), { textGridding: descriptor_1.textGridding.encode(text.gridding), Ornt: descriptor_1.Ornt.encode(text.orientation), AntA: descriptor_1.Annt.encode(text.antiAlias) }), ((_a = text.textOnPath) === null || _a === void 0 ? void 0 : _a.type) !== void 0 ? { TxPT: `TxPT.${text.textOnPath.type}` } : {}), ((_b = text.textOnPath) === null || _b === void 0 ? void 0 : _b.direction) !== void 0 ? { TxPR: `TxPR.${text.textOnPath.direction}` } : {}), ((_c = text.textOnPath) === null || _c === void 0 ? void 0 : _c.mirror) !== void 0 ? { TxMP: !!text.textOnPath.mirror } : {}), text.bounds ? { bounds: (0, descriptor_1.boundsToDescBounds)(text.bounds) } : {}), text.boundingBox ? { boundingBox: (0, descriptor_1.boundsToDescBounds)(text.boundingBox) } : {}), { TextIndex: text.index || 0 }), text.verticalAlignment !== void 0 ? { VAlign: text.verticalAlignment } : {}), { EngineData: (0, engineData_1.serializeEngineData)((0, text_1.encodeEngineData)(text)) });
      (0, psdWriter_1.writeInt16)(writer, 1);
      for (let i = 0; i < 6; i++) {
        (0, psdWriter_1.writeFloat64)(writer, transform[i]);
      }
      (0, psdWriter_1.writeInt16)(writer, 50);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "TxLr", textDescriptor, "text");
      (0, psdWriter_1.writeInt16)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "warp", encodeWarp(warp));
      (0, psdWriter_1.writeFloat32)(writer, (_d = text.left) !== null && _d !== void 0 ? _d : 0);
      (0, psdWriter_1.writeFloat32)(writer, (_e = text.top) !== null && _e !== void 0 ? _e : 0);
      (0, psdWriter_1.writeFloat32)(writer, (_f = text.right) !== null && _f !== void 0 ? _f : 0);
      (0, psdWriter_1.writeFloat32)(writer, (_g = text.bottom) !== null && _g !== void 0 ? _g : 0);
    });
    addHandler("tySh", () => false, (reader, target, left) => {
      if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid tySh version`);
      const transform = [];
      for (let i = 0; i < 6; i++)
        transform.push((0, psdReader_1.readFloat64)(reader));
      if ((0, psdReader_1.readInt16)(reader) !== 6)
        throw new Error(`Invalid tySh font version`);
      const data = { transform, faces: [], styles: [], lines: [], color: { r: 0, g: 0, b: 0 }, antiAlias: false };
      const facesCount = (0, psdReader_1.readInt16)(reader);
      for (let i = 0; i < facesCount; i++) {
        const mark = (0, psdReader_1.readInt16)(reader);
        (0, psdReader_1.readInt32)(reader);
        const name = (0, psdReader_1.readPascalString)(reader, 1);
        const familyName = (0, psdReader_1.readPascalString)(reader, 1);
        const styleName = (0, psdReader_1.readPascalString)(reader, 1);
        const script = (0, psdReader_1.readInt16)(reader);
        const axesCount = (0, psdReader_1.readInt32)(reader);
        if (axesCount < 0 || axesCount * 4 > left())
          throw new Error(`Invalid tySh design axes count`);
        (0, psdReader_1.skipBytes)(reader, axesCount * 4);
        data.faces.push({ mark, name, familyName, styleName, script });
      }
      const stylesCount = (0, psdReader_1.readInt16)(reader);
      for (let i = 0; i < stylesCount; i++) {
        const mark = (0, psdReader_1.readInt16)(reader);
        const faceMark = (0, psdReader_1.readInt16)(reader);
        const size = (0, psdReader_1.readInt32)(reader);
        const tracking = (0, psdReader_1.readInt32)(reader);
        const kerning = (0, psdReader_1.readInt32)(reader);
        const leading = (0, psdReader_1.readInt32)(reader);
        const baselineShift = (0, psdReader_1.readInt32)(reader);
        const autoKerning = !!(0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.readUint8)(reader);
        data.styles.push({ mark, faceMark, size, tracking, kerning, leading, baselineShift, autoKerning });
      }
      (0, psdReader_1.readInt16)(reader);
      (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      (0, psdReader_1.readInt32)(reader);
      const linesCount = (0, psdReader_1.readInt16)(reader);
      for (let i = 0; i < linesCount; i++) {
        const charCount = (0, psdReader_1.readInt32)(reader);
        const orientation = (0, psdReader_1.readInt16)(reader);
        const alignment = (0, psdReader_1.readInt16)(reader);
        if (charCount < 0 || charCount * 4 > left())
          throw new Error(`Invalid tySh character count`);
        const chars = [];
        for (let j = 0; j < charCount; j++) {
          const code = (0, psdReader_1.readUint16)(reader);
          const style = (0, psdReader_1.readInt16)(reader);
          chars.push({ code, style });
        }
        data.lines.push({ orientation, alignment, chars });
      }
      data.color = (0, psdReader_1.readColor)(reader);
      data.antiAlias = !!(0, psdReader_1.readUint8)(reader);
      if (!target.text)
        target.text = (0, text_1.decodeLegacyTextData)(data);
      (0, psdReader_1.skipBytes)(reader, left());
    }, () => {
    });
    addHandler("SoCo", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && target.vectorFill.type === "color", (reader, target, left) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("GdFl", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && (target.vectorFill.type === "solid" || target.vectorFill.type === "noise"), (reader, target, left) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("PtFl", (target) => target.vectorFill !== void 0 && target.vectorStroke === void 0 && target.vectorFill.type === "pattern", (reader, target, left) => {
      const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    addHandler("vscg", (target) => target.vectorFill !== void 0 && target.vectorStroke !== void 0, (reader, target, left) => {
      (0, psdReader_1.readSignature)(reader);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorFill = (0, descriptor_1.parseVectorContent)(desc);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const { descriptor, key } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
      (0, psdWriter_1.writeSignature)(writer, key);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", descriptor);
    });
    function readBezierKnot(reader, width, height) {
      const y0 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x0 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      const y1 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x1 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      const y2 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
      const x2 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
      return [x0, y0, x1, y1, x2, y2];
    }
    function writeBezierKnot(writer, points, width, height) {
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[1] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[0] / width);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[3] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[2] / width);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[5] / height);
      (0, psdWriter_1.writeFixedPointPath32)(writer, points[4] / width);
    }
    exports.booleanOperations = ["exclude", "combine", "subtract", "intersect"];
    function readVectorMask(reader, vectorMask, width, height, size) {
      const end = reader.offset + size;
      const paths = vectorMask.paths;
      let path = void 0;
      while (end - reader.offset >= 26) {
        const selector = (0, psdReader_1.readUint16)(reader);
        switch (selector) {
          case 0:
          // Closed subpath length record
          case 3: {
            (0, psdReader_1.readUint16)(reader);
            const boolOp = (0, psdReader_1.readInt16)(reader);
            const flags = (0, psdReader_1.readUint16)(reader);
            (0, psdReader_1.skipBytes)(reader, 18);
            path = {
              open: selector === 3,
              knots: [],
              fillRule: flags === 2 ? "non-zero" : "even-odd"
            };
            if (boolOp !== -1)
              path.operation = exports.booleanOperations[boolOp];
            paths.push(path);
            break;
          }
          case 1:
          // Closed subpath Bezier knot, linked
          case 2:
          // Closed subpath Bezier knot, unlinked
          case 4:
          // Open subpath Bezier knot, linked
          case 5:
            if (!path)
              throw new Error("Bezier knot record without subpath length record");
            path.knots.push({ linked: selector === 1 || selector === 4, points: readBezierKnot(reader, width, height) });
            break;
          case 6:
            (0, psdReader_1.skipBytes)(reader, 24);
            break;
          case 7: {
            const top = (0, psdReader_1.readFixedPointPath32)(reader);
            const left = (0, psdReader_1.readFixedPointPath32)(reader);
            const bottom = (0, psdReader_1.readFixedPointPath32)(reader);
            const right = (0, psdReader_1.readFixedPointPath32)(reader);
            const resolution = (0, psdReader_1.readFixedPointPath32)(reader);
            (0, psdReader_1.skipBytes)(reader, 4);
            vectorMask.clipboard = { top, left, bottom, right, resolution };
            break;
          }
          case 8:
            vectorMask.fillStartsWithAllPixels = !!(0, psdReader_1.readUint16)(reader);
            (0, psdReader_1.skipBytes)(reader, 22);
            break;
          default:
            throw new Error("Invalid vmsk section");
        }
      }
      return paths;
    }
    function writeVectorMask(writer, vectorMask, width, height, componentIndices = false) {
      (0, psdWriter_1.writeUint16)(writer, 6);
      (0, psdWriter_1.writeZeros)(writer, 24);
      const clipboard = vectorMask.clipboard;
      if (clipboard) {
        (0, psdWriter_1.writeUint16)(writer, 7);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.top);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.left);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.bottom);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.right);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.resolution);
        (0, psdWriter_1.writeZeros)(writer, 4);
      }
      (0, psdWriter_1.writeUint16)(writer, 8);
      (0, psdWriter_1.writeUint16)(writer, vectorMask.fillStartsWithAllPixels ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 22);
      let componentIndex = -1;
      for (const path of vectorMask.paths) {
        if (path.operation || componentIndex < 0)
          componentIndex++;
        (0, psdWriter_1.writeUint16)(writer, path.open ? 3 : 0);
        (0, psdWriter_1.writeUint16)(writer, path.knots.length);
        (0, psdWriter_1.writeUint16)(writer, path.operation ? exports.booleanOperations.indexOf(path.operation) : -1);
        (0, psdWriter_1.writeUint16)(writer, path.fillRule === "non-zero" ? 2 : 1);
        (0, psdWriter_1.writeZeros)(writer, 4);
        (0, psdWriter_1.writeUint32)(writer, componentIndices ? componentIndex : 0);
        (0, psdWriter_1.writeZeros)(writer, 10);
        const linkedKnot = path.open ? 4 : 1;
        const unlinkedKnot = path.open ? 5 : 2;
        for (const { linked, points } of path.knots) {
          (0, psdWriter_1.writeUint16)(writer, linked ? linkedKnot : unlinkedKnot);
          writeBezierKnot(writer, points, width, height);
        }
      }
    }
    addHandler("vmsk", hasKey("vectorMask"), (reader, target, left, { width, height }) => {
      if ((0, psdReader_1.readUint32)(reader) !== 3)
        throw new Error("Invalid vmsk version");
      target.vectorMask = { paths: [] };
      const vectorMask = target.vectorMask;
      const flags = (0, psdReader_1.readUint32)(reader);
      vectorMask.invert = (flags & 1) !== 0;
      vectorMask.notLink = (flags & 2) !== 0;
      vectorMask.disable = (flags & 4) !== 0;
      readVectorMask(reader, vectorMask, width, height, left());
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target, { width, height }) => {
      const vectorMask = target.vectorMask;
      const flags = (vectorMask.invert ? 1 : 0) | (vectorMask.notLink ? 2 : 0) | (vectorMask.disable ? 4 : 0);
      (0, psdWriter_1.writeUint32)(writer, 3);
      (0, psdWriter_1.writeUint32)(writer, flags);
      writeVectorMask(writer, vectorMask, width, height, true);
    });
    addHandlerAlias("vsms", "vmsk");
    addHandler(
      "vowv",
      // something with vectors?
      hasKey("vowv"),
      (reader, target) => {
        target.vowv = (0, psdReader_1.readUint32)(reader);
      },
      (writer, target) => {
        (0, psdWriter_1.writeUint32)(writer, target.vowv);
      }
    );
    function parseBoxCorners(corners) {
      return [
        (0, descriptor_1.horzVrtcToXY)(corners.rectangleCornerA),
        (0, descriptor_1.horzVrtcToXY)(corners.rectangleCornerB),
        (0, descriptor_1.horzVrtcToXY)(corners.rectangleCornerC),
        (0, descriptor_1.horzVrtcToXY)(corners.rectangleCornerD)
      ];
    }
    function serializeBoxCorners(corners) {
      return {
        rectangleCornerA: (0, descriptor_1.xyToHorzVrtc)(corners[0]),
        rectangleCornerB: (0, descriptor_1.xyToHorzVrtc)(corners[1]),
        rectangleCornerC: (0, descriptor_1.xyToHorzVrtc)(corners[2]),
        rectangleCornerD: (0, descriptor_1.xyToHorzVrtc)(corners[3])
      };
    }
    function parseKeyDescriptorList(desc) {
      const keyDescriptorList = [];
      for (const i of desc.keyDescriptorList) {
        const item = {};
        if (i.keyShapeInvalidated != null)
          item.keyShapeInvalidated = i.keyShapeInvalidated;
        if (i.keyOriginType != null)
          item.keyOriginType = i.keyOriginType;
        if (i.keyOriginResolution != null)
          item.keyOriginResolution = i.keyOriginResolution;
        if (i.keyOriginShapeBBox) {
          item.keyOriginShapeBoundingBox = {
            top: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox["Top "]),
            left: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Left),
            bottom: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Btom),
            right: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Rght)
          };
        }
        const rectRadii = i.keyOriginRRectRadii;
        if (rectRadii) {
          item.keyOriginRRectRadii = {
            topRight: (0, descriptor_1.parseUnits)(rectRadii.topRight),
            topLeft: (0, descriptor_1.parseUnits)(rectRadii.topLeft),
            bottomLeft: (0, descriptor_1.parseUnits)(rectRadii.bottomLeft),
            bottomRight: (0, descriptor_1.parseUnits)(rectRadii.bottomRight)
          };
        }
        if (i.keyOriginBoxCorners)
          item.keyOriginBoxCorners = parseBoxCorners(i.keyOriginBoxCorners);
        if (i.keyOriginPolySides != null)
          item.keyOriginPolySides = i.keyOriginPolySides;
        if (i.keyOriginPolyCornerRadius != null)
          item.keyOriginPolyCornerRadius = i.keyOriginPolyCornerRadius;
        if (i.keyOriginPolyStarRatio)
          item.keyOriginPolyStarRatio = (0, descriptor_1.parsePercent)(i.keyOriginPolyStarRatio);
        if (i.keyOriginPolyPreviousTightBoxCorners)
          item.keyOriginPolyPreviousTightBoxCorners = parseBoxCorners(i.keyOriginPolyPreviousTightBoxCorners);
        if (i.keyOriginPolyTrueRectCorners)
          item.keyOriginPolyTrueRectCorners = parseBoxCorners(i.keyOriginPolyTrueRectCorners);
        if (i.keyOriginPolyPixelHSF != null)
          item.keyOriginPolyPixelHSF = i.keyOriginPolyPixelHSF;
        if (i.keyOriginLineStart)
          item.keyOriginLineStart = (0, descriptor_1.horzVrtcToXY)(i.keyOriginLineStart);
        if (i.keyOriginLineEnd)
          item.keyOriginLineEnd = (0, descriptor_1.horzVrtcToXY)(i.keyOriginLineEnd);
        if (i.keyOriginLineWeight != null)
          item.keyOriginLineWeight = i.keyOriginLineWeight;
        if (i.keyOriginLineArrowSt != null)
          item.keyOriginLineArrowStart = i.keyOriginLineArrowSt;
        if (i.keyOriginLineArrowEnd != null)
          item.keyOriginLineArrowEnd = i.keyOriginLineArrowEnd;
        if (i.keyOriginLineArrWdth != null)
          item.keyOriginLineArrowWidth = i.keyOriginLineArrWdth;
        if (i.keyOriginLineArrLngth != null)
          item.keyOriginLineArrowLength = i.keyOriginLineArrLngth;
        if (i.keyOriginLineArrConc != null)
          item.keyOriginLineArrowConcavity = i.keyOriginLineArrConc;
        const trnf = i.Trnf;
        if (trnf) {
          item.transform = [trnf.xx, trnf.xy, trnf.yx, trnf.yy, trnf.tx, trnf.ty];
        }
        keyDescriptorList.push(item);
      }
      return keyDescriptorList;
    }
    function serializeKeyDescriptorList(keyDescriptorList) {
      const desc = { keyDescriptorList: [] };
      for (let i = 0; i < keyDescriptorList.length; i++) {
        const item = keyDescriptorList[i];
        desc.keyDescriptorList.push({});
        const out = desc.keyDescriptorList[desc.keyDescriptorList.length - 1];
        if (item.keyOriginType != null)
          out.keyOriginType = item.keyOriginType;
        if (item.keyOriginResolution != null)
          out.keyOriginResolution = item.keyOriginResolution;
        const radii = item.keyOriginRRectRadii;
        if (radii) {
          out.keyOriginRRectRadii = {
            unitValueQuadVersion: 1,
            topRight: (0, descriptor_1.unitsValue)(radii.topRight, "topRight"),
            topLeft: (0, descriptor_1.unitsValue)(radii.topLeft, "topLeft"),
            bottomLeft: (0, descriptor_1.unitsValue)(radii.bottomLeft, "bottomLeft"),
            bottomRight: (0, descriptor_1.unitsValue)(radii.bottomRight, "bottomRight")
          };
        }
        const box = item.keyOriginShapeBoundingBox;
        if (box) {
          out.keyOriginShapeBBox = {
            unitValueQuadVersion: 1,
            "Top ": (0, descriptor_1.unitsValue)(box.top, "top"),
            Left: (0, descriptor_1.unitsValue)(box.left, "left"),
            Btom: (0, descriptor_1.unitsValue)(box.bottom, "bottom"),
            Rght: (0, descriptor_1.unitsValue)(box.right, "right")
          };
        }
        const corners = item.keyOriginBoxCorners;
        if (corners && corners.length === 4)
          out.keyOriginBoxCorners = serializeBoxCorners(corners);
        if (item.keyOriginPolySides != null)
          out.keyOriginPolySides = item.keyOriginPolySides;
        if (item.keyOriginPolyCornerRadius != null)
          out.keyOriginPolyCornerRadius = item.keyOriginPolyCornerRadius;
        if (item.keyOriginPolyStarRatio != null)
          out.keyOriginPolyStarRatio = (0, descriptor_1.unitsPercentF)(item.keyOriginPolyStarRatio);
        const previousCorners = item.keyOriginPolyPreviousTightBoxCorners;
        if (previousCorners && previousCorners.length === 4)
          out.keyOriginPolyPreviousTightBoxCorners = serializeBoxCorners(previousCorners);
        const trueCorners = item.keyOriginPolyTrueRectCorners;
        if (trueCorners && trueCorners.length === 4)
          out.keyOriginPolyTrueRectCorners = serializeBoxCorners(trueCorners);
        if (item.keyOriginPolyPixelHSF != null)
          out.keyOriginPolyPixelHSF = item.keyOriginPolyPixelHSF;
        if (item.keyOriginLineEnd)
          out.keyOriginLineEnd = (0, descriptor_1.xyToHorzVrtc)(item.keyOriginLineEnd);
        if (item.keyOriginLineStart)
          out.keyOriginLineStart = (0, descriptor_1.xyToHorzVrtc)(item.keyOriginLineStart);
        if (item.keyOriginLineWeight != null)
          out.keyOriginLineWeight = item.keyOriginLineWeight;
        if (item.keyOriginLineArrowStart != null)
          out.keyOriginLineArrowSt = !!item.keyOriginLineArrowStart;
        if (item.keyOriginLineArrowEnd != null)
          out.keyOriginLineArrowEnd = !!item.keyOriginLineArrowEnd;
        if (item.keyOriginLineArrowWidth != null)
          out.keyOriginLineArrWdth = item.keyOriginLineArrowWidth;
        if (item.keyOriginLineArrowLength != null)
          out.keyOriginLineArrLngth = item.keyOriginLineArrowLength;
        if (item.keyOriginLineArrowConcavity != null)
          out.keyOriginLineArrConc = item.keyOriginLineArrowConcavity;
        const transform = item.transform;
        if (transform && transform.length === 6) {
          out.Trnf = {
            xx: transform[0],
            xy: transform[1],
            yx: transform[2],
            yy: transform[3],
            tx: transform[4],
            ty: transform[5]
          };
        }
        if (item.keyShapeInvalidated != null)
          out.keyShapeInvalidated = item.keyShapeInvalidated;
        out.keyOriginIndex = i;
      }
      return desc;
    }
    addHandler("vogk", hasKey("vectorOrigination"), (reader, target, left) => {
      if ((0, psdReader_1.readInt32)(reader) !== 1)
        throw new Error(`Invalid vogk version`);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorOrigination = { keyDescriptorList: parseKeyDescriptorList(desc) };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const desc = serializeKeyDescriptorList(target.vectorOrigination.keyDescriptorList);
      (0, psdWriter_1.writeInt32)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("lmfx", (target) => target.effects !== void 0 && !isGroupLayer(target) && hasMultiEffects(target.effects), (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 0)
        throw new Error("Invalid lmfx version");
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.effects = (0, descriptor_1.parseEffects)(desc, reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const desc = (0, descriptor_1.serializeEffects)(target.effects, writer, true);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("lrFX", hasKey("effects"), (reader, target, left) => {
      if (!target.effects)
        target.effects = (0, effectsHelpers_1.readEffects)(reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      (0, effectsHelpers_1.writeEffects)(writer, target.effects);
    });
    addHandler("luni", hasKey("name"), (reader, target, left) => {
      if (left() > 4) {
        const length = (0, psdReader_1.readUint32)(reader);
        if (left() >= length * 2) {
          target.name = (0, psdReader_1.readUnicodeStringWithLength)(reader, length);
        } else {
          if (reader.logDevFeatures)
            reader.log("name in luni section is too long");
        }
      } else {
        if (reader.logDevFeatures)
          reader.log("empty luni section");
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      (0, psdWriter_1.writeUnicodeString)(writer, target.name);
    });
    addHandler("lnsr", hasKey("nameSource"), (reader, target) => target.nameSource = (0, psdReader_1.readSignature)(reader), (writer, target) => (0, psdWriter_1.writeSignature)(writer, target.nameSource));
    function layerNeedsId(target) {
      return !!(target.animationFrames || target.timeline || target.comps);
    }
    function getExplicitLayerIds(psd, options) {
      if (!options.explicitLayerIds) {
        const ids = /* @__PURE__ */ new Set();
        const addIds = (layers) => {
          for (const layer of layers !== null && layers !== void 0 ? layers : []) {
            if (layer.id !== void 0)
              ids.add(layer.id);
            addIds(layer.children);
          }
        };
        addIds(psd.children);
        options.explicitLayerIds = ids;
      }
      return options.explicitLayerIds;
    }
    function getLayerId(target, options) {
      var _a;
      const id = (_a = options.layerToId.get(target)) !== null && _a !== void 0 ? _a : target.id;
      if (id === void 0)
        throw new Error("Missing layer id");
      return id;
    }
    addHandler("lyid", (target) => target.id !== void 0 || layerNeedsId(target), (reader, target) => {
      target.id = (0, psdReader_1.readUint32)(reader);
    }, (writer, target, psd, options) => {
      var _a;
      let id;
      if (target.id !== void 0) {
        id = target.id;
        if (options.layerIds.has(id)) {
          const explicitIds = getExplicitLayerIds(psd, options);
          while (options.layerIds.has(id) || explicitIds.has(id))
            id += 100;
        }
      } else {
        const explicitIds = getExplicitLayerIds(psd, options);
        id = (_a = options.nextGeneratedLayerId) !== null && _a !== void 0 ? _a : 1;
        while (options.layerIds.has(id) || explicitIds.has(id))
          id++;
        options.nextGeneratedLayerId = id + 1;
      }
      (0, psdWriter_1.writeUint32)(writer, id);
      options.layerIds.add(id);
      options.layerToId.set(target, id);
    });
    addHandler("lsct", hasKey("sectionDivider"), (reader, target, left) => {
      target.sectionDivider = { type: (0, psdReader_1.readUint32)(reader) };
      if (left()) {
        (0, psdReader_1.checkSignature)(reader, "8BIM");
        target.sectionDivider.key = (0, psdReader_1.readSignature)(reader);
      }
      if (left()) {
        target.sectionDivider.subType = (0, psdReader_1.readUint32)(reader);
      }
    }, (writer, target) => {
      (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.type);
      if (target.sectionDivider.key) {
        (0, psdWriter_1.writeSignature)(writer, "8BIM");
        (0, psdWriter_1.writeSignature)(writer, target.sectionDivider.key);
        if (target.sectionDivider.subType !== void 0) {
          (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.subType);
        }
      }
    });
    addHandlerAlias("lsdk", "lsct");
    addHandler("clbl", hasKey("blendClippendElements"), (reader, target) => {
      target.blendClippendElements = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.blendClippendElements ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("infx", hasKey("blendInteriorElements"), (reader, target) => {
      target.blendInteriorElements = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.blendInteriorElements ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("knko", hasKey("knockout"), (reader, target) => {
      target.knockout = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.knockout ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("lmgm", hasKey("layerMaskAsGlobalMask"), (reader, target) => {
      target.layerMaskAsGlobalMask = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.layerMaskAsGlobalMask ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("vmgm", hasKey("vectorMaskAsGlobalMask"), (reader, target) => {
      target.vectorMaskAsGlobalMask = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.vectorMaskAsGlobalMask ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("ffxi", hasKey("foreignEffectId"), (reader, target) => {
      target.foreignEffectId = (0, psdReader_1.readInt32)(reader);
    }, (writer, target) => {
      (0, psdWriter_1.writeInt32)(writer, target.foreignEffectId);
    });
    addHandler("shpa", hasKey("patternData"), (reader, target, left) => {
      if ((0, psdReader_1.readInt32)(reader) !== 0)
        throw new Error(`Invalid shpa version`);
      const count = (0, psdReader_1.readInt32)(reader);
      target.patternData = [];
      for (let i = 0; i < count && left() > 0; i++) {
        const signature = (0, psdReader_1.readSignature)(reader);
        const key = (0, psdReader_1.readSignature)(reader);
        const patternsCount = (0, psdReader_1.readInt32)(reader);
        const copyOnSheetDuplication = !!(0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.skipBytes)(reader, 3);
        const patterns = [];
        for (let j = 0; j < patternsCount && left() > 0; j++) {
          const colorHandling = descriptor_1.patternColorHandling.decode("." + (0, psdReader_1.readSignature)(reader));
          (0, psdReader_1.readPascalString)(reader, 1);
          const name = (0, psdReader_1.readUnicodeString)(reader);
          const id = (0, psdReader_1.readPascalString)(reader, 1);
          patterns.push({ colorHandling, name, id });
        }
        target.patternData.push({ signature, key, copyOnSheetDuplication, patterns });
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const sets = target.patternData;
      (0, psdWriter_1.writeInt32)(writer, 0);
      (0, psdWriter_1.writeInt32)(writer, sets.length);
      for (const set of sets) {
        (0, psdWriter_1.writeSignature)(writer, set.signature);
        (0, psdWriter_1.writeSignature)(writer, set.key);
        (0, psdWriter_1.writeInt32)(writer, set.patterns.length);
        (0, psdWriter_1.writeUint8)(writer, set.copyOnSheetDuplication ? 1 : 0);
        (0, psdWriter_1.writeZeros)(writer, 3);
        for (const pattern of set.patterns) {
          (0, psdWriter_1.writeSignature)(writer, descriptor_1.patternColorHandling.encode(pattern.colorHandling).split(".")[1]);
          (0, psdWriter_1.writePascalString)(writer, pattern.name.replace(/[^\x20-\x7e]/g, "?"), 1);
          (0, psdWriter_1.writeUnicodeString)(writer, pattern.name);
          (0, psdWriter_1.writePascalString)(writer, pattern.id, 1);
        }
      }
    });
    addHandler("lspf", hasKey("protected"), (reader, target) => {
      const flags = (0, psdReader_1.readUint32)(reader);
      target.protected = {
        transparency: (flags & 1) !== 0,
        composite: (flags & 2) !== 0,
        position: (flags & 4) !== 0
      };
      if (flags & 8)
        target.protected.artboards = true;
      if (flags & 2147483648)
        target.protected.all = true;
    }, (writer, target) => {
      const flags = (target.protected.transparency ? 1 : 0) | (target.protected.composite ? 2 : 0) | (target.protected.position ? 4 : 0) | (target.protected.artboards ? 8 : 0) | (target.protected.all ? 2147483648 : 0);
      (0, psdWriter_1.writeUint32)(writer, flags >>> 0);
    });
    addHandler("lclr", hasKey("layerColor"), (reader, target) => {
      const color = (0, psdReader_1.readUint16)(reader);
      (0, psdReader_1.skipBytes)(reader, 6);
      target.layerColor = helpers_1.layerColors[color];
    }, (writer, target) => {
      const index = helpers_1.layerColors.indexOf(target.layerColor);
      (0, psdWriter_1.writeUint16)(writer, index === -1 ? 0 : index);
      (0, psdWriter_1.writeZeros)(writer, 6);
    });
    function parseGeneratorSettings(settings) {
      const result = {};
      if (settings.exportAs) {
        result.exportAs = {};
        if (settings.exportAs.exportOption !== void 0)
          result.exportAs.exportOption = settings.exportAs.exportOption;
        if (settings.exportAs.scaleSettings !== void 0)
          result.exportAs.scaleSettings = settings.exportAs.scaleSettings;
      }
      if (settings.generator_45_assets)
        result.assets = settings.generator_45_assets.json;
      if (settings.layerTime !== void 0)
        result.layerTime = settings.layerTime;
      if (settings.crema)
        result.crema = settings.crema.json;
      return result;
    }
    function serializeGeneratorSettings(generatorSettings) {
      const settings = {
        _name: "",
        _classID: generatorSettings.assets !== void 0 ? "generatorSettings" : "null"
      };
      if (generatorSettings.exportAs) {
        settings.exportAs = { _name: "", _classID: "null" };
        if (generatorSettings.exportAs.exportOption !== void 0)
          settings.exportAs.exportOption = generatorSettings.exportAs.exportOption;
        if (generatorSettings.exportAs.scaleSettings !== void 0)
          settings.exportAs.scaleSettings = generatorSettings.exportAs.scaleSettings;
      }
      if (generatorSettings.assets !== void 0)
        settings.generator_45_assets = { _name: "", _classID: "generatorSettings", json: generatorSettings.assets };
      if (generatorSettings.layerTime !== void 0)
        settings.layerTime = generatorSettings.layerTime;
      if (generatorSettings.crema !== void 0)
        settings.crema = { _name: "", _classID: "null", json: generatorSettings.crema };
      return { generatorSettings: settings };
    }
    function isDocument(target) {
      return target.width !== void 0;
    }
    var knockoutType = (0, helpers_1.createEnum)("knockout", "none", {
      none: "none",
      shallow: "shallow",
      deep: "deep"
    });
    function parseLayerStateBlendOptions(desc, target) {
      if (desc["Md  "] !== void 0)
        target.blendMode = descriptor_1.BlnM.decode(desc["Md  "]);
      if (desc.Opct !== void 0)
        target.opacity = (0, descriptor_1.parsePercent)(desc.Opct);
      if (desc.fillOpacity !== void 0)
        target.fillOpacity = (0, descriptor_1.parsePercent)(desc.fillOpacity);
      if (desc.blendInterior !== void 0)
        target.blendInteriorElements = desc.blendInterior;
      if (desc.blendClipped !== void 0)
        target.blendClippedElements = desc.blendClipped;
      if (desc.knockout !== void 0)
        target.knockout = knockoutType.decode(desc.knockout);
    }
    function serializeLayerStateBlendOptions(source) {
      const desc = {};
      if (source.blendMode !== void 0)
        desc["Md  "] = descriptor_1.BlnM.encode(source.blendMode);
      if (source.opacity !== void 0)
        desc.Opct = (0, descriptor_1.unitsPercentF)(source.opacity);
      if (source.fillOpacity !== void 0)
        desc.fillOpacity = (0, descriptor_1.unitsPercentF)(source.fillOpacity);
      if (source.blendInteriorElements !== void 0)
        desc.blendInterior = !!source.blendInteriorElements;
      if (source.blendClippedElements !== void 0)
        desc.blendClipped = !!source.blendClippedElements;
      if (source.knockout !== void 0)
        desc.knockout = knockoutType.encode(source.knockout);
      return Object.keys(desc).length ? desc : void 0;
    }
    function parseLayerStateSpecific(desc, target) {
      const settings = desc.textLayerSettings;
      if (settings) {
        target.text = {
          warp: {
            style: descriptor_1.warpStyle.decode(settings.warpStyle),
            value: settings.warpValue || 0,
            perspective: settings.warpPerspective || 0,
            perspectiveOther: settings.warpPerspectiveOther || 0,
            rotate: descriptor_1.Ornt.decode(settings.warpRotate)
          },
          warpRect: settings.textLayerSettingsWarpRect || [0, 0, 0, 0]
        };
      }
      if (desc.placedLayerSettings)
        target.placedLayerCompId = desc.placedLayerSettings.placedLayerCompID;
    }
    function serializeLayerStateSpecific(source) {
      const desc = {};
      const text = source.text;
      if (text) {
        desc.textLayerSettings = {
          warpStyle: descriptor_1.warpStyle.encode(text.warp.style),
          warpValue: text.warp.value || 0,
          warpPerspective: text.warp.perspective || 0,
          warpPerspectiveOther: text.warp.perspectiveOther || 0,
          warpRotate: descriptor_1.Ornt.encode(text.warp.rotate),
          textLayerSettingsWarpRect: text.warpRect || [0, 0, 0, 0]
        };
      }
      if (source.placedLayerCompId !== void 0)
        desc.placedLayerSettings = { placedLayerCompID: source.placedLayerCompId };
      return Object.keys(desc).length ? desc : void 0;
    }
    addHandler(
      "shmd",
      // Metadata setting
      // Metadata setting
      (target) => target.timestamp !== void 0 || target.animationFrames !== void 0 || target.animationFrameFlags !== void 0 || target.timeline !== void 0 || target.comps !== void 0 || target.generatorSettings !== void 0 && !isDocument(target),
      (reader, target, left) => {
        const count = (0, psdReader_1.readUint32)(reader);
        for (let i = 0; i < count; i++) {
          const signature = (0, psdReader_1.readSignature)(reader);
          if (signature !== "8BIM" && signature !== "8ELE")
            throw new Error(`Invalid shmd signature: '${signature}'`);
          const key = (0, psdReader_1.readSignature)(reader);
          (0, psdReader_1.readUint8)(reader);
          (0, psdReader_1.skipBytes)(reader, 3);
          const end = reader.offset + 4 + reader.view.getUint32(reader.offset);
          try {
            (0, psdReader_1.readSection)(reader, 1, (left2) => {
              var _a, _b, _c;
              if (key === "cust") {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                if (desc.layerTime !== void 0)
                  target.timestamp = desc.layerTime;
              } else if (key === "mlst") {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                target.animationFrames = [];
                for (let i2 = 0; i2 < desc.LaSt.length; i2++) {
                  const f = desc.LaSt[i2];
                  const frame = { frames: f.FrLs };
                  if (f.enab !== void 0)
                    frame.enable = f.enab;
                  if (f.Ofst)
                    frame.offset = (0, descriptor_1.horzVrtcToXY)(f.Ofst);
                  if ((_a = f.IMsk) === null || _a === void 0 ? void 0 : _a.Ofst)
                    frame.maskOffset = (0, descriptor_1.horzVrtcToXY)(f.IMsk.Ofst);
                  if ((_b = f.VMsk) === null || _b === void 0 ? void 0 : _b.Ofst)
                    frame.vectorMaskOffset = (0, descriptor_1.horzVrtcToXY)(f.VMsk.Ofst);
                  if (f.FXRf)
                    frame.referencePoint = (0, descriptor_1.horzVrtcToXY)(f.FXRf);
                  if (f.Lefx)
                    frame.effects = (0, descriptor_1.parseEffects)(f.Lefx, reader);
                  if (f.blendOptions)
                    parseLayerStateBlendOptions(f.blendOptions, frame);
                  if (f.LSpc)
                    parseLayerStateSpecific(f.LSpc, frame);
                  target.animationFrames.push(frame);
                }
              } else if (key === "mdyn") {
                (0, psdReader_1.readUint16)(reader);
                const propagate = (0, psdReader_1.readUint8)(reader);
                const flags = (0, psdReader_1.readUint8)(reader);
                target.animationFrameFlags = {
                  propagateFrameOne: !propagate,
                  unifyLayerPosition: (flags & 1) !== 0,
                  unifyLayerStyle: (flags & 2) !== 0,
                  unifyLayerVisibility: (flags & 4) !== 0
                };
              } else if (key === "tmln") {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                const timeScope = desc.timeScope;
                const timeline = {
                  start: (0, descriptor_1.frac)(timeScope.Strt),
                  duration: (0, descriptor_1.frac)(timeScope.duration),
                  inTime: (0, descriptor_1.frac)(timeScope.inTime),
                  outTime: (0, descriptor_1.frac)(timeScope.outTime),
                  autoScope: desc.autoScope,
                  audioLevel: desc.audioLevel
                };
                if (desc.trackList) {
                  timeline.tracks = (0, descriptor_1.parseTrackList)(desc.trackList, reader);
                }
                target.timeline = timeline;
              } else if (key === "cmls") {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                target.comps = {
                  settings: []
                };
                if (desc.origFXRefPoint)
                  target.comps.originalEffectsReferencePoint = { x: desc.origFXRefPoint.Hrzn, y: desc.origFXRefPoint.Vrtc };
                for (const item of desc.layerSettings) {
                  target.comps.settings.push({ compList: item.compList });
                  const t = target.comps.settings[target.comps.settings.length - 1];
                  if ("enab" in item)
                    t.enabled = item.enab;
                  if (item.Ofst)
                    t.offset = { x: item.Ofst.Hrzn, y: item.Ofst.Vrtc };
                  if ((_c = item.vectorMask) === null || _c === void 0 ? void 0 : _c.Ofst)
                    t.vectorMaskOffset = (0, descriptor_1.horzVrtcToXY)(item.vectorMask.Ofst);
                  if (item.Lefx)
                    t.effects = (0, descriptor_1.parseEffects)(item.Lefx, reader);
                  if (item.blendOptions)
                    parseLayerStateBlendOptions(item.blendOptions, t);
                  if (item.FXRefPoint)
                    t.effectsReferencePoint = { x: item.FXRefPoint.Hrzn, y: item.FXRefPoint.Vrtc };
                  if (item.layerSpecific)
                    parseLayerStateSpecific(item.layerSpecific, t);
                }
              } else if (key === "extn") {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                if (desc.generatorSettings)
                  target.generatorSettings = parseGeneratorSettings(desc.generatorSettings);
              } else {
                reader.logMissingFeatures && reader.log('Unhandled "shmd" section key', key);
              }
              (0, psdReader_1.skipBytes)(reader, left2());
            });
          } catch (e) {
            if (reader.throwForMissingFeatures)
              throw e;
            reader.logMissingFeatures && reader.log(`Failed to read "shmd" section key ${key}: ${e.message}`);
            reader.offset = end;
          }
        }
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target, _, options) => {
        const { animationFrames, animationFrameFlags, timestamp, timeline, comps } = target;
        const generatorSettings = isDocument(target) ? void 0 : target.generatorSettings;
        let count = 0;
        if (animationFrames)
          count++;
        if (animationFrameFlags)
          count++;
        if (timeline)
          count++;
        if (timestamp !== void 0)
          count++;
        if (comps)
          count++;
        if (generatorSettings)
          count++;
        (0, psdWriter_1.writeUint32)(writer, count);
        if (animationFrames) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "mlst");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
              LaID: getLayerId(target, options),
              LaSt: []
            };
            for (let i = 0; i < animationFrames.length; i++) {
              const f = animationFrames[i];
              const frame = {};
              if (f.enable !== void 0)
                frame.enab = f.enable;
              frame.FrLs = f.frames;
              if (f.offset)
                frame.Ofst = (0, descriptor_1.xyToHorzVrtc)(f.offset);
              if (f.maskOffset)
                frame.IMsk = { Ofst: (0, descriptor_1.xyToHorzVrtc)(f.maskOffset) };
              if (f.vectorMaskOffset)
                frame.VMsk = { Ofst: (0, descriptor_1.xyToHorzVrtc)(f.vectorMaskOffset) };
              if (f.referencePoint)
                frame.FXRf = (0, descriptor_1.xyToHorzVrtc)(f.referencePoint);
              const layerSpecific = serializeLayerStateSpecific(f);
              if (layerSpecific)
                frame.LSpc = layerSpecific;
              if (f.effects)
                frame.Lefx = (0, descriptor_1.serializeEffects)(f.effects, writer, hasMultiEffects(f.effects));
              const blendOptions = serializeLayerStateBlendOptions(f);
              if (blendOptions)
                frame.blendOptions = blendOptions;
              desc.LaSt.push(frame);
            }
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, descriptor_1.layerStateRoot);
          }, true);
        }
        if (animationFrameFlags) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "mdyn");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            (0, psdWriter_1.writeUint16)(writer, 0);
            (0, psdWriter_1.writeUint8)(writer, animationFrameFlags.propagateFrameOne ? 0 : 15);
            (0, psdWriter_1.writeUint8)(writer, (animationFrameFlags.unifyLayerPosition ? 1 : 0) | (animationFrameFlags.unifyLayerStyle ? 2 : 0) | (animationFrameFlags.unifyLayerVisibility ? 4 : 0));
          });
        }
        if (timeline) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "tmln");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
              Vrsn: 1,
              timeScope: {
                Vrsn: 1,
                Strt: timeline.start,
                duration: timeline.duration,
                inTime: timeline.inTime,
                outTime: timeline.outTime
              },
              autoScope: timeline.autoScope,
              audioLevel: timeline.audioLevel
            };
            if (timeline.tracks) {
              desc.trackList = (0, descriptor_1.serializeTrackList)(timeline.tracks, writer);
            }
            desc.LyrI = getLayerId(target, options);
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "anim");
          }, true);
        }
        if (timestamp !== void 0) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "cust");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
              layerTime: timestamp
            };
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "metadata", desc);
          }, true);
        }
        if (comps) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "cmls");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {};
            if (comps.originalEffectsReferencePoint) {
              desc.origFXRefPoint = { Hrzn: comps.originalEffectsReferencePoint.x, Vrtc: comps.originalEffectsReferencePoint.y };
            }
            desc.LyrI = getLayerId(target, options);
            desc.layerSettings = [];
            for (const item of comps.settings) {
              const t = {};
              if (item.enabled !== void 0)
                t.enab = item.enabled;
              if (item.offset)
                t.Ofst = (0, descriptor_1.xyToHorzVrtc)(item.offset);
              if (item.vectorMaskOffset)
                t.vectorMask = { Ofst: (0, descriptor_1.xyToHorzVrtc)(item.vectorMaskOffset) };
              if (item.effects) {
                const _a = (0, descriptor_1.serializeEffects)(item.effects, writer, true), { numModifyingFX: _2 } = _a, effects = __rest(_a, ["numModifyingFX"]);
                t.Lefx = effects;
              }
              const blendOptions = serializeLayerStateBlendOptions(item);
              if (blendOptions)
                t.blendOptions = blendOptions;
              if (item.effectsReferencePoint)
                t.FXRefPoint = { Hrzn: item.effectsReferencePoint.x, Vrtc: item.effectsReferencePoint.y };
              const layerSpecific = serializeLayerStateSpecific(item);
              if (layerSpecific)
                t.layerSpecific = layerSpecific;
              t.compList = item.compList;
              desc.layerSettings.push(t);
            }
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, descriptor_1.layerStateRoot);
          }, true);
        }
        if (generatorSettings) {
          (0, psdWriter_1.writeSignature)(writer, "8BIM");
          (0, psdWriter_1.writeSignature)(writer, "extn");
          (0, psdWriter_1.writeUint8)(writer, 0);
          (0, psdWriter_1.writeZeros)(writer, 3);
          (0, psdWriter_1.writeSection)(writer, 2, () => {
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", serializeGeneratorSettings(generatorSettings));
          }, true);
        }
      }
    );
    addHandler("PxSc", hasKey("pixelSource"), (reader, target) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
      if (desc.pixelSourceType === 1986285651) {
        target.pixelSource = {
          type: "vdPS",
          origin: { x: desc.origin.Hrzn, y: desc.origin.Vrtc },
          interpretation: {
            interpretAlpha: desc.interpretation.interpretAlpha.split(".")[1],
            profile: desc.interpretation.profile
          },
          frameReader: {
            type: "QTFR",
            link: {
              name: desc.frameReader["Lnk "]["Nm  "],
              fullPath: desc.frameReader["Lnk "].fullPath,
              originalPath: desc.frameReader["Lnk "].originalPath,
              relativePath: desc.frameReader["Lnk "].relPath,
              alias: desc.frameReader["Lnk "].alis
            },
            mediaDescriptor: desc.frameReader.mediaDescriptor
          },
          showAlteredVideo: desc.showAlteredVideo
        };
      } else {
        reader.log(`Unknown pixelSourceType`);
      }
    }, (writer, target) => {
      const source = target.pixelSource;
      const desc = {
        _name: "",
        _classID: "PixelSource",
        pixelSourceType: 1986285651,
        // vdP
        descVersion: 1,
        origin: { Hrzn: source.origin.x, Vrtc: source.origin.y },
        // written as 'null' class with 'long' values (see writeDescriptorStructure)
        interpretation: {
          _name: "",
          _classID: "footageInterpretation",
          Vrsn: 1,
          interpretAlpha: `alphaInterpretation.${source.interpretation.interpretAlpha}`,
          profile: source.interpretation.profile
        },
        frameReader: {
          _name: "",
          _classID: "FrameReader",
          frameReaderType: 1364477522,
          // QTF
          descVersion: 1,
          "Lnk ": {
            _name: "",
            _classID: "ExternalFileLink",
            descVersion: 2,
            "Nm  ": source.frameReader.link.name,
            fullPath: source.frameReader.link.fullPath,
            originalPath: source.frameReader.link.originalPath,
            alis: source.frameReader.link.alias,
            relPath: source.frameReader.link.relativePath
          },
          mediaDescriptor: source.frameReader.mediaDescriptor
        },
        showAlteredVideo: source.showAlteredVideo
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "PixelSource", desc);
    });
    addHandler("vstk", hasKey("vectorStroke"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.vectorStroke = {
        strokeEnabled: desc.strokeEnabled,
        fillEnabled: desc.fillEnabled,
        lineWidth: (0, descriptor_1.parseUnits)(desc.strokeStyleLineWidth),
        lineDashOffset: (0, descriptor_1.parseUnits)(desc.strokeStyleLineDashOffset),
        miterLimit: desc.strokeStyleMiterLimit,
        lineCapType: descriptor_1.strokeStyleLineCapType.decode(desc.strokeStyleLineCapType),
        lineJoinType: descriptor_1.strokeStyleLineJoinType.decode(desc.strokeStyleLineJoinType),
        lineAlignment: descriptor_1.strokeStyleLineAlignment.decode(desc.strokeStyleLineAlignment),
        scaleLock: desc.strokeStyleScaleLock,
        strokeAdjust: desc.strokeStyleStrokeAdjust,
        lineDashSet: (desc.strokeStyleLineDashSet || []).map(descriptor_1.parseUnits),
        blendMode: descriptor_1.BlnM.decode(desc.strokeStyleBlendMode),
        opacity: (0, descriptor_1.parsePercent)(desc.strokeStyleOpacity),
        content: (0, descriptor_1.parseVectorContent)(desc.strokeStyleContent),
        resolution: desc.strokeStyleResolution
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a, _b, _c;
      const stroke = target.vectorStroke;
      const desc = {
        strokeStyleVersion: 2,
        strokeEnabled: !!stroke.strokeEnabled,
        fillEnabled: !!stroke.fillEnabled,
        strokeStyleLineWidth: stroke.lineWidth || { value: 3, units: "Points" },
        strokeStyleLineDashOffset: stroke.lineDashOffset || { value: 0, units: "Points" },
        strokeStyleMiterLimit: (_a = stroke.miterLimit) !== null && _a !== void 0 ? _a : 100,
        strokeStyleLineCapType: descriptor_1.strokeStyleLineCapType.encode(stroke.lineCapType),
        strokeStyleLineJoinType: descriptor_1.strokeStyleLineJoinType.encode(stroke.lineJoinType),
        strokeStyleLineAlignment: descriptor_1.strokeStyleLineAlignment.encode(stroke.lineAlignment),
        strokeStyleScaleLock: !!stroke.scaleLock,
        strokeStyleStrokeAdjust: !!stroke.strokeAdjust,
        strokeStyleLineDashSet: stroke.lineDashSet || [],
        strokeStyleBlendMode: descriptor_1.BlnM.encode(stroke.blendMode),
        strokeStyleOpacity: (0, descriptor_1.unitsPercent)((_b = stroke.opacity) !== null && _b !== void 0 ? _b : 1),
        strokeStyleContent: (0, descriptor_1.serializeVectorContent)(stroke.content || { type: "color", color: { r: 0, g: 0, b: 0 } }).descriptor,
        strokeStyleResolution: (_c = stroke.resolution) !== null && _c !== void 0 ? _c : 72
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "strokeStyle", desc);
    });
    addHandler(
      "artb",
      // per-layer arboard info
      hasKey("artboard"),
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        const rect = desc.artboardRect;
        target.artboard = {
          rect: { top: rect["Top "], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
          guideIndices: desc.guideIndeces,
          presetName: desc.artboardPresetName
        };
        if (desc["Clr "])
          target.artboard.color = (0, descriptor_1.parseColor)(desc["Clr "]);
        if (desc.artboardBackgroundType !== void 0)
          target.artboard.backgroundType = desc.artboardBackgroundType;
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        var _a;
        const artboard = target.artboard;
        const rect = artboard.rect;
        const desc = {
          artboardRect: { "Top ": rect.top, Left: rect.left, Btom: rect.bottom, Rght: rect.right },
          guideIndeces: artboard.guideIndices || [],
          artboardPresetName: artboard.presetName || "",
          "Clr ": (0, descriptor_1.serializeColor)(artboard.color),
          artboardBackgroundType: (_a = artboard.backgroundType) !== null && _a !== void 0 ? _a : 1
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "artboard", desc);
      }
    );
    addHandler("sn2P", hasKey("usingAlignedRendering"), (reader, target) => target.usingAlignedRendering = !!(0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.usingAlignedRendering ? 1 : 0));
    var placedLayerTypes = ["unknown", "vector", "raster", "image stack"];
    function parseWarp(warp) {
      var _a, _b, _c, _d, _e, _f;
      const result = Object.assign(Object.assign({ style: descriptor_1.warpStyle.decode(warp.warpStyle) }, warp.warpValues ? { values: warp.warpValues } : { value: warp.warpValue || 0 }), { perspective: warp.warpPerspective || 0, perspectiveOther: warp.warpPerspectiveOther || 0, rotate: descriptor_1.Ornt.decode(warp.warpRotate), bounds: warp.bounds && {
        top: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds["Top "]),
        left: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Left),
        bottom: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Btom),
        right: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Rght)
      }, uOrder: warp.uOrder, vOrder: warp.vOrder });
      if (warp.deformNumRows != null || warp.deformNumCols != null) {
        result.deformNumRows = warp.deformNumRows;
        result.deformNumCols = warp.deformNumCols;
      }
      const envelopeWarp = warp.customEnvelopeWarp;
      if (envelopeWarp) {
        result.customEnvelopeWarp = {
          meshPoints: []
        };
        const xs = ((_a = envelopeWarp.meshPoints.find((i) => i.type === "Hrzn")) === null || _a === void 0 ? void 0 : _a.values) || [];
        const ys = ((_b = envelopeWarp.meshPoints.find((i) => i.type === "Vrtc")) === null || _b === void 0 ? void 0 : _b.values) || [];
        for (let i = 0; i < xs.length; i++) {
          result.customEnvelopeWarp.meshPoints.push({ x: xs[i], y: ys[i] });
        }
        if (envelopeWarp.quiltSliceX || envelopeWarp.quiltSliceY) {
          result.customEnvelopeWarp.quiltSliceX = ((_d = (_c = envelopeWarp.quiltSliceX) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.values) || [];
          result.customEnvelopeWarp.quiltSliceY = ((_f = (_e = envelopeWarp.quiltSliceY) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.values) || [];
        }
      }
      return result;
    }
    function isQuiltWarp(warp) {
      var _a, _b;
      return warp.deformNumCols != null || warp.deformNumRows != null || ((_a = warp.customEnvelopeWarp) === null || _a === void 0 ? void 0 : _a.quiltSliceX) || ((_b = warp.customEnvelopeWarp) === null || _b === void 0 ? void 0 : _b.quiltSliceY);
    }
    function encodeWarp(warp) {
      const bounds = warp.bounds;
      const desc = Object.assign(Object.assign({ warpStyle: descriptor_1.warpStyle.encode(warp.style) }, warp.values ? { warpValues: warp.values } : { warpValue: warp.value || 0 }), { warpPerspective: warp.perspective || 0, warpPerspectiveOther: warp.perspectiveOther || 0, warpRotate: descriptor_1.Ornt.encode(warp.rotate), bounds: (
        /*1 ? { // testing
            _classID: 'classFloatRect',
            'Top ': bounds && bounds.top && bounds.top.value || 0,
            Left: bounds && bounds.left && bounds.left.value || 0,
            Btom: bounds && bounds.bottom && bounds.bottom.value || 0,
            Rght: bounds && bounds.right && bounds.right.value || 0,
        } :*/
        {
          "Top ": (0, descriptor_1.unitsValue)(bounds && bounds.top || { units: "Pixels", value: 0 }, "bounds.top"),
          Left: (0, descriptor_1.unitsValue)(bounds && bounds.left || { units: "Pixels", value: 0 }, "bounds.left"),
          Btom: (0, descriptor_1.unitsValue)(bounds && bounds.bottom || { units: "Pixels", value: 0 }, "bounds.bottom"),
          Rght: (0, descriptor_1.unitsValue)(bounds && bounds.right || { units: "Pixels", value: 0 }, "bounds.right")
        }
      ), uOrder: warp.uOrder || 0, vOrder: warp.vOrder || 0 });
      const isQuilt = isQuiltWarp(warp);
      if (isQuilt) {
        const desc2 = desc;
        desc2.deformNumRows = warp.deformNumRows || 0;
        desc2.deformNumCols = warp.deformNumCols || 0;
      }
      const customEnvelopeWarp = warp.customEnvelopeWarp;
      if (customEnvelopeWarp) {
        const meshPoints = customEnvelopeWarp.meshPoints || [];
        if (isQuilt) {
          const desc2 = desc;
          desc2.customEnvelopeWarp = {
            _name: "",
            _classID: "customEnvelopeWarp",
            quiltSliceX: [{
              type: "quiltSliceX",
              values: customEnvelopeWarp.quiltSliceX || []
            }],
            quiltSliceY: [{
              type: "quiltSliceY",
              values: customEnvelopeWarp.quiltSliceY || []
            }],
            meshPoints: [
              { type: "Hrzn", values: meshPoints.map((p) => p.x) },
              { type: "Vrtc", values: meshPoints.map((p) => p.y) }
            ]
          };
        } else {
          desc.customEnvelopeWarp = {
            _name: "",
            _classID: "customEnvelopeWarp",
            meshPoints: [
              { type: "Hrzn", values: meshPoints.map((p) => p.x) },
              { type: "Vrtc", values: meshPoints.map((p) => p.y) }
            ]
          };
        }
      }
      return desc;
    }
    addHandler(
      "PlLd",
      (target) => !!target.placedLayer && !target.placedLayer.external,
      // linked smart objects are stored in SoLE
      (reader, target, left) => {
        if ((0, psdReader_1.readSignature)(reader) !== "plcL")
          throw new Error(`Invalid PlLd signature`);
        if ((0, psdReader_1.readInt32)(reader) !== 3)
          throw new Error(`Invalid PlLd version`);
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const pageNumber = (0, psdReader_1.readInt32)(reader);
        const totalPages = (0, psdReader_1.readInt32)(reader);
        (0, psdReader_1.readInt32)(reader);
        const placedLayerType = (0, psdReader_1.readInt32)(reader);
        if (!placedLayerTypes[placedLayerType])
          throw new Error("Invalid PlLd type");
        const transform = [];
        for (let i = 0; i < 8; i++)
          transform.push((0, psdReader_1.readFloat64)(reader));
        const warpVersion = (0, psdReader_1.readInt32)(reader);
        if (warpVersion !== 0)
          throw new Error(`Invalid Warp version ${warpVersion}`);
        const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.placedLayer = target.placedLayer || {
          id,
          type: placedLayerTypes[placedLayerType],
          pageNumber,
          totalPages,
          transform,
          warp: parseWarp(warp)
        };
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        const placed = target.placedLayer;
        (0, psdWriter_1.writeSignature)(writer, "plcL");
        (0, psdWriter_1.writeInt32)(writer, 3);
        if (!placed.id || typeof placed.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
          throw new Error("Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
        }
        (0, psdWriter_1.writePascalString)(writer, placed.id, 1);
        (0, psdWriter_1.writeInt32)(writer, placed.pageNumber || 1);
        (0, psdWriter_1.writeInt32)(writer, placed.totalPages || 1);
        (0, psdWriter_1.writeInt32)(writer, 16);
        if (placedLayerTypes.indexOf(placed.type) === -1)
          throw new Error("Invalid placedLayer type");
        (0, psdWriter_1.writeInt32)(writer, placedLayerTypes.indexOf(placed.type));
        for (let i = 0; i < 8; i++)
          (0, psdWriter_1.writeFloat64)(writer, placed.transform[i]);
        (0, psdWriter_1.writeInt32)(writer, 0);
        const warp = getWarpFromPlacedLayer(placed);
        const isQuilt = isQuiltWarp(warp);
        const type = isQuilt ? "quiltWarp" : "warp";
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", type, encodeWarp(warp), type);
      }
    );
    var levelsFilterKeys = ["_name", "_classID", "presetKind", "Adjs"];
    var levelsFilterAdjustmentKeys = ["_name", "_classID", "Chnl", "Inpt", "Otpt", "Gmm "];
    function uint8ToFloat32(array) {
      const length = Math.floor(array.byteLength / 4);
      return new Float32Array(array.buffer.slice(array.byteOffset, array.byteOffset + length * 4), 0, length);
    }
    function uint8ToUint32(array) {
      const length = Math.floor(array.byteLength / 4);
      return new Uint32Array(array.buffer.slice(array.byteOffset, array.byteOffset + length * 4), 0, length);
    }
    function toUint8(array) {
      return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    }
    function arrayToPoints(array) {
      const points = [];
      for (let i = 0; i < array.length; i += 2) {
        points.push({ x: array[i], y: array[i + 1] });
      }
      return points;
    }
    function pointsToArray(points) {
      const array = [];
      for (let i = 0; i < points.length; i++) {
        array.push(points[i].x, points[i].y);
      }
      return array;
    }
    function uint8ToPoints(array) {
      return arrayToPoints(uint8ToFloat32(array));
    }
    function hrznVrtcToPoint(desc) {
      return {
        x: (0, descriptor_1.parseUnits)(desc.Hrzn),
        y: (0, descriptor_1.parseUnits)(desc.Vrtc)
      };
    }
    function pointToHrznVrtc(point) {
      return {
        _name: "",
        _classID: "Pnt ",
        Hrzn: (0, descriptor_1.unitsValue)(point.x, "x"),
        Vrtc: (0, descriptor_1.unitsValue)(point.y, "y")
      };
    }
    var cameraRawColorKeys = [
      ["red", "R"],
      ["orange", "O"],
      ["yellow", "Y"],
      ["green", "G"],
      ["aqua", "A"],
      ["blue", "B"],
      ["purple", "P"],
      ["magenta", "M"]
    ];
    var cameraRawSettings = [
      ["version", "CrVe"],
      ["processVersion", "PrVN"],
      ["processVersionCode", "PrVe"],
      ["whiteBalance", "WBal"],
      ["temperature", "Temp"],
      ["tint", "Tint"],
      ["exposure", "Ex12"],
      ["contrast", "Cr12"],
      ["highlights", "Hi12"],
      ["shadows", "Sh12"],
      ["whites", "Wh12"],
      ["blacks", "Bk12"],
      ["texture", "CrTx"],
      ["clarity", "Cl12"],
      ["dehaze", "Dhze"],
      ["vibrance", "Vibr"],
      ["saturation", "Strt"],
      ["parametricCurve.shadows", "PC_S"],
      ["parametricCurve.darks", "PC_D"],
      ["parametricCurve.lights", "PC_L"],
      ["parametricCurve.highlights", "PC_H"],
      ["parametricCurve.shadowSplit", "PC_1"],
      ["parametricCurve.midtoneSplit", "PC_2"],
      ["parametricCurve.highlightSplit", "PC_3"],
      ["pointCurve.composite", "Crv "],
      ["pointCurve.red", "CrvR"],
      ["pointCurve.green", "CrvG"],
      ["pointCurve.blue", "CrvB"],
      ...cameraRawColorKeys.map(([name, key]) => [`hsl.hue.${name}`, `HA_${key}`]),
      ...cameraRawColorKeys.map(([name, key]) => [`hsl.saturation.${name}`, `SA_${key}`]),
      ...cameraRawColorKeys.map(([name, key]) => [`hsl.luminance.${name}`, `LA_${key}`]),
      ["colorGrading.shadows.hue", "STSH"],
      ["colorGrading.shadows.saturation", "STSS"],
      ["colorGrading.shadows.luminance", "CgSL"],
      ["colorGrading.midtones.hue", "CgMH"],
      ["colorGrading.midtones.saturation", "CgMS"],
      ["colorGrading.midtones.luminance", "CgML"],
      ["colorGrading.highlights.hue", "STHH"],
      ["colorGrading.highlights.saturation", "STHS"],
      ["colorGrading.highlights.luminance", "CgHL"],
      ["colorGrading.global.hue", "CgGH"],
      ["colorGrading.global.saturation", "CgGS"],
      ["colorGrading.global.luminance", "CgGL"],
      ["colorGrading.blending", "CgBl"],
      ["colorGrading.balance", "STB "],
      ["sharpening.amount", "Shrp"],
      ["sharpening.radius", "ShpR"],
      ["sharpening.detail", "ShpD"],
      ["sharpening.masking", "ShpM"],
      ["noiseReduction.luminance", "LNR "],
      ["noiseReduction.luminanceDetail", "LNRD"],
      ["noiseReduction.luminanceContrast", "LNRC"],
      ["noiseReduction.color", "CNR "],
      ["noiseReduction.colorDetail", "CNRD"],
      ["noiseReduction.colorSmoothness", "CNRS"],
      ["grain.amount", "GRNA"],
      ["grain.size", "GRNS"],
      ["grain.roughness", "GRNF"],
      ["postCropVignette.amount", "PCVA"],
      ["postCropVignette.midpoint", "PCVM"],
      ["postCropVignette.feather", "PCVF"],
      ["postCropVignette.roundness", "PCVR"]
    ];
    var cameraRawCurveKeys = ["Crv ", "CrvR", "CrvG", "CrvB"];
    var cameraRawFilterID = 2783;
    function parseCameraRawSettings(desc, reader) {
      var _a;
      const settings = {};
      for (const [path, key] of cameraRawSettings) {
        let value = desc[key];
        if (value === void 0)
          continue;
        if (key === "WBal") {
          value = value.split(".")[1];
        } else if (cameraRawCurveKeys.includes(key)) {
          const values = value;
          value = [];
          for (let i = 0; i + 1 < values.length; i += 2)
            value.push({ input: values[i], output: values[i + 1] });
        }
        const parts = path.split(".");
        let target = settings;
        for (let i = 0; i < parts.length - 1; i++)
          target = target[parts[i]] = (_a = target[parts[i]]) !== null && _a !== void 0 ? _a : {};
        target[parts[parts.length - 1]] = value;
      }
      for (const key of Object.keys(desc)) {
        if (key !== "_name" && key !== "_classID" && !cameraRawSettings.some((s) => s[1] === key)) {
          reader.logMissingFeatures && reader.log(`Unhandled Camera Raw Filter setting: ${key}`);
        }
      }
      return settings;
    }
    function serializeCameraRawSettings(settings) {
      const desc = { _name: "", _classID: descriptor_1.cameraRawFilterClassID };
      for (const [path, key] of cameraRawSettings) {
        let value = settings;
        for (const part of path.split("."))
          value = value === null || value === void 0 ? void 0 : value[part];
        if (value === void 0)
          continue;
        if (key === "WBal") {
          value = `WBal.${value}`;
        } else if (cameraRawCurveKeys.includes(key)) {
          value = value.flatMap((p) => [Math.round(p.input), Math.round(p.output)]);
        } else if (typeof value === "number" && key !== "Ex12" && key !== "ShpR") {
          value = Math.round(value);
        }
        desc[key] = value;
      }
      return desc;
    }
    function parseFilterFXItem(f, reader) {
      const base = {
        name: f["Nm  "],
        opacity: (0, descriptor_1.parsePercent)(f.blendOptions.Opct),
        blendMode: descriptor_1.BlnM.decode(f.blendOptions["Md  "]),
        enabled: f.enab,
        hasOptions: f.hasoptions,
        foregroundColor: (0, descriptor_1.parseColor)(f.FrgC),
        backgroundColor: (0, descriptor_1.parseColor)(f.BckC)
      };
      if ("Fltr" in f && f.Fltr._classID === descriptor_1.cameraRawFilterClassID) {
        return Object.assign(Object.assign({}, base), { type: "camera raw", filter: parseCameraRawSettings(f.Fltr, reader) });
      }
      if ("Fltr" in f) {
        switch (f.Fltr._classID) {
          case "boxblur":
            return Object.assign(Object.assign({}, base), { type: "box blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "GsnB":
            return Object.assign(Object.assign({}, base), { type: "gaussian blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "MtnB":
            return Object.assign(Object.assign({}, base), { type: "motion blur", filter: {
              angle: f.Fltr.Angl,
              distance: (0, descriptor_1.parseUnits)(f.Fltr.Dstn)
            } });
          case "RdlB":
            return Object.assign(Object.assign({}, base), { type: "radial blur", filter: {
              amount: f.Fltr.Amnt,
              method: descriptor_1.BlrM.decode(f.Fltr.BlrM),
              quality: descriptor_1.BlrQ.decode(f.Fltr.BlrQ)
            } });
          case "shapeBlur":
            return Object.assign(Object.assign({}, base), { type: "shape blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              customShape: { name: f.Fltr.customShape["Nm  "], id: f.Fltr.customShape.Idnt }
            } });
          case "SmrB":
            return Object.assign(Object.assign({}, base), { type: "smart blur", filter: {
              radius: f.Fltr["Rds "],
              threshold: f.Fltr.Thsh,
              quality: descriptor_1.SmBQ.decode(f.Fltr.SmBQ),
              mode: descriptor_1.SmBM.decode(f.Fltr.SmBM)
            } });
          case "surfaceBlur":
            return Object.assign(Object.assign({}, base), { type: "surface blur", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh
            } });
          case "Dspl":
            return Object.assign(Object.assign({}, base), { type: "displace", filter: {
              horizontalScale: f.Fltr.HrzS,
              verticalScale: f.Fltr.VrtS,
              displacementMap: descriptor_1.DspM.decode(f.Fltr.DspM),
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA),
              displacementFile: {
                signature: f.Fltr.DspF.sig,
                path: f.Fltr.DspF.path
              }
            } });
          case "Pnch":
            return Object.assign(Object.assign({}, base), { type: "pinch", filter: {
              amount: f.Fltr.Amnt
            } });
          case "Plr ":
            return Object.assign(Object.assign({}, base), { type: "polar coordinates", filter: {
              conversion: descriptor_1.Cnvr.decode(f.Fltr.Cnvr)
            } });
          case "Rple":
            return Object.assign(Object.assign({}, base), { type: "ripple", filter: {
              amount: f.Fltr.Amnt,
              size: descriptor_1.RplS.decode(f.Fltr.RplS)
            } });
          case "Shr ":
            return Object.assign(Object.assign({}, base), { type: "shear", filter: {
              shearPoints: f.Fltr.ShrP.map((p) => ({ x: p.Hrzn, y: p.Vrtc })),
              shearStart: f.Fltr.ShrS,
              shearEnd: f.Fltr.ShrE,
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA)
            } });
          case "Sphr":
            return Object.assign(Object.assign({}, base), { type: "spherize", filter: {
              amount: f.Fltr.Amnt,
              mode: descriptor_1.SphM.decode(f.Fltr.SphM)
            } });
          case "Twrl":
            return Object.assign(Object.assign({}, base), { type: "twirl", filter: {
              angle: f.Fltr.Angl
            } });
          case "Wave":
            return Object.assign(Object.assign({}, base), { type: "wave", filter: {
              numberOfGenerators: f.Fltr.NmbG,
              type: descriptor_1.Wvtp.decode(f.Fltr.Wvtp),
              wavelength: { min: f.Fltr.WLMn, max: f.Fltr.WLMx },
              amplitude: { min: f.Fltr.AmMn, max: f.Fltr.AmMx },
              scale: { x: f.Fltr.SclH, y: f.Fltr.SclV },
              randomSeed: f.Fltr.RndS,
              undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA)
            } });
          case "ZgZg":
            return Object.assign(Object.assign({}, base), { type: "zigzag", filter: {
              amount: f.Fltr.Amnt,
              ridges: f.Fltr.NmbR,
              style: descriptor_1.ZZTy.decode(f.Fltr.ZZTy)
            } });
          case "AdNs":
            return Object.assign(Object.assign({}, base), { type: "add noise", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Nose),
              distribution: descriptor_1.Dstr.decode(f.Fltr.Dstr),
              monochromatic: f.Fltr.Mnch,
              randomSeed: f.Fltr.FlRs
            } });
          case "DstS":
            return Object.assign(Object.assign({}, base), { type: "dust and scratches", filter: {
              radius: f.Fltr["Rds "],
              threshold: f.Fltr.Thsh
            } });
          case "Mdn ":
            return Object.assign(Object.assign({}, base), { type: "median", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "denoise":
            return Object.assign(Object.assign({}, base), { type: "reduce noise", filter: {
              preset: f.Fltr.preset,
              removeJpegArtifact: f.Fltr.removeJPEGArtifact,
              reduceColorNoise: (0, descriptor_1.parsePercent)(f.Fltr.ClNs),
              sharpenDetails: (0, descriptor_1.parsePercent)(f.Fltr.Shrp),
              channelDenoise: f.Fltr.channelDenoise.map((c) => Object.assign({ channels: c.Chnl.map(descriptor_1.Chnl.decode), amount: c.Amnt }, c.EdgF ? { preserveDetails: c.EdgF } : {}))
            } });
          case "ClrH":
            return Object.assign(Object.assign({}, base), { type: "color halftone", filter: {
              radius: f.Fltr["Rds "],
              angle1: f.Fltr.Ang1,
              angle2: f.Fltr.Ang2,
              angle3: f.Fltr.Ang3,
              angle4: f.Fltr.Ang4
            } });
          case "Crst":
            return Object.assign(Object.assign({}, base), { type: "crystallize", filter: {
              cellSize: f.Fltr.ClSz,
              randomSeed: f.Fltr.FlRs
            } });
          case "Mztn":
            return Object.assign(Object.assign({}, base), { type: "mezzotint", filter: {
              type: descriptor_1.MztT.decode(f.Fltr.MztT),
              randomSeed: f.Fltr.FlRs
            } });
          case "Msc ":
            return Object.assign(Object.assign({}, base), { type: "mosaic", filter: {
              cellSize: (0, descriptor_1.parseUnits)(f.Fltr.ClSz)
            } });
          case "Pntl":
            return Object.assign(Object.assign({}, base), { type: "pointillize", filter: {
              cellSize: f.Fltr.ClSz,
              randomSeed: f.Fltr.FlRs
            } });
          case "Clds":
            return Object.assign(Object.assign({}, base), { type: "clouds", filter: {
              randomSeed: f.Fltr.FlRs
            } });
          case "DfrC":
            return Object.assign(Object.assign({}, base), { type: "difference clouds", filter: {
              randomSeed: f.Fltr.FlRs
            } });
          case "Fbrs":
            return Object.assign(Object.assign({}, base), { type: "fibers", filter: {
              variance: f.Fltr.Vrnc,
              strength: f.Fltr.Strg,
              randomSeed: f.Fltr.RndS
            } });
          case "LnsF":
            return Object.assign(Object.assign({}, base), { type: "lens flare", filter: {
              brightness: f.Fltr.Brgh,
              position: { x: f.Fltr.FlrC.Hrzn, y: f.Fltr.FlrC.Vrtc },
              lensType: descriptor_1.Lns.decode(f.Fltr["Lns "])
            } });
          case "smartSharpen":
            return Object.assign(Object.assign({}, base), { type: "smart sharpen", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh,
              angle: f.Fltr.Angl,
              moreAccurate: f.Fltr.moreAccurate,
              blur: descriptor_1.blurType.decode(f.Fltr.blur),
              preset: f.Fltr.preset,
              shadow: {
                fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Amnt),
                tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Wdth),
                radius: f.Fltr.sdwM["Rds "]
              },
              highlight: {
                fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Amnt),
                tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Wdth),
                radius: f.Fltr.hglM["Rds "]
              }
            } });
          case "UnsM":
            return Object.assign(Object.assign({}, base), { type: "unsharp mask", filter: {
              amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "]),
              threshold: f.Fltr.Thsh
            } });
          case "Dfs ":
            return Object.assign(Object.assign({}, base), { type: "diffuse", filter: {
              mode: descriptor_1.DfsM.decode(f.Fltr["Md  "]),
              randomSeed: f.Fltr.FlRs
            } });
          case "Embs":
            return Object.assign(Object.assign({}, base), { type: "emboss", filter: {
              angle: f.Fltr.Angl,
              height: f.Fltr.Hght,
              amount: f.Fltr.Amnt
            } });
          case "Extr":
            return Object.assign(Object.assign({}, base), { type: "extrude", filter: {
              type: descriptor_1.ExtT.decode(f.Fltr.ExtT),
              size: f.Fltr.ExtS,
              depth: f.Fltr.ExtD,
              depthMode: descriptor_1.ExtR.decode(f.Fltr.ExtR),
              randomSeed: f.Fltr.FlRs,
              solidFrontFaces: f.Fltr.ExtF,
              maskIncompleteBlocks: f.Fltr.ExtM
            } });
          case "Tls ":
            return Object.assign(Object.assign({}, base), { type: "tiles", filter: {
              numberOfTiles: f.Fltr.TlNm,
              maximumOffset: f.Fltr.TlOf,
              fillEmptyAreaWith: descriptor_1.FlCl.decode(f.Fltr.FlCl),
              randomSeed: f.Fltr.FlRs
            } });
          case "TrcC":
            return Object.assign(Object.assign({}, base), { type: "trace contour", filter: {
              level: f.Fltr["Lvl "],
              edge: descriptor_1.CntE.decode(f.Fltr["Edg "])
            } });
          case "Wnd ":
            return Object.assign(Object.assign({}, base), { type: "wind", filter: {
              method: descriptor_1.WndM.decode(f.Fltr.WndM),
              direction: descriptor_1.Drct.decode(f.Fltr.Drct)
            } });
          case "Dntr":
            return Object.assign(Object.assign({}, base), { type: "de-interlace", filter: {
              eliminate: descriptor_1.IntE.decode(f.Fltr.IntE),
              newFieldsBy: descriptor_1.IntC.decode(f.Fltr.IntC)
            } });
          case "Cstm":
            return Object.assign(Object.assign({}, base), { type: "custom", filter: {
              scale: f.Fltr["Scl "],
              offset: f.Fltr.Ofst,
              matrix: f.Fltr.Mtrx
            } });
          case "HghP":
            return Object.assign(Object.assign({}, base), { type: "high pass", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Mxm ":
            return Object.assign(Object.assign({}, base), { type: "maximum", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Mnm ":
            return Object.assign(Object.assign({}, base), { type: "minimum", filter: {
              radius: (0, descriptor_1.parseUnits)(f.Fltr["Rds "])
            } });
          case "Ofst":
            return Object.assign(Object.assign({}, base), { type: "offset", filter: {
              horizontal: f.Fltr.Hrzn,
              vertical: f.Fltr.Vrtc,
              undefinedAreas: descriptor_1.FlMd.decode(f.Fltr["Fl  "])
            } });
          case "rigidTransform":
            return Object.assign(Object.assign({}, base), { type: "puppet", filter: {
              rigidType: f.Fltr.rigidType,
              bounds: [
                { x: f.Fltr.PuX0, y: f.Fltr.PuY0 },
                { x: f.Fltr.PuX1, y: f.Fltr.PuY1 },
                { x: f.Fltr.PuX2, y: f.Fltr.PuY2 },
                { x: f.Fltr.PuX3, y: f.Fltr.PuY3 }
              ],
              puppetShapeList: (f.Fltr.puppetShapeList || []).map((p) => ({
                rigidType: p.rigidType,
                // VrsM / VrsN - version (always 1.0)
                originalVertexArray: uint8ToPoints(p.originalVertexArray),
                deformedVertexArray: uint8ToPoints(p.deformedVertexArray),
                indexArray: Array.from(uint8ToUint32(p.indexArray)),
                pinOffsets: arrayToPoints(p.pinOffsets),
                posFinalPins: arrayToPoints(p.posFinalPins),
                pinVertexIndices: p.pinVertexIndices,
                selectedPin: p.selectedPin,
                pinPosition: arrayToPoints(p.PinP),
                pinRotation: p.PnRt,
                pinOverlay: p.PnOv,
                pinDepth: p.PnDp,
                meshQuality: p.meshQuality,
                meshExpansion: p.meshExpansion,
                meshRigidity: p.meshRigidity,
                imageResolution: p.imageResolution,
                meshBoundaryPath: {
                  pathComponents: p.meshBoundaryPath.pathComponents.map((c) => ({
                    shapeOperation: c.shapeOperation.split(".")[1],
                    paths: c.SbpL.map((t) => ({
                      closed: t.Clsp,
                      points: t["Pts "].map((pt) => ({
                        anchor: hrznVrtcToPoint(pt.Anch),
                        forward: hrznVrtcToPoint(pt["Fwd "]),
                        backward: hrznVrtcToPoint(pt["Bwd "]),
                        smooth: pt.Smoo
                      }))
                    }))
                  }))
                }
              }))
            } });
          case "PbPl": {
            const parameters = [];
            const Flrt = f.Fltr;
            for (let i = 0; i < fromAtoZ.length; i++) {
              if (!Flrt[`PN${fromAtoZ[i]}a`])
                break;
              for (let j = 0; j < fromAtoZ.length; j++) {
                if (!Flrt[`PN${fromAtoZ[i]}${fromAtoZ[j]}`])
                  break;
                parameters.push({
                  name: Flrt[`PN${fromAtoZ[i]}${fromAtoZ[j]}`],
                  value: Flrt[`PF${fromAtoZ[i]}${fromAtoZ[j]}`]
                });
              }
            }
            return Object.assign(Object.assign({}, base), { type: "oil paint plugin", filter: {
              name: f.Fltr.KnNm,
              gpu: f.Fltr.GpuY,
              lighting: f.Fltr.LIWy,
              parameters
            } });
          }
          // case 2089: return {
          // 	...base,
          // 	type: 'adaptive wide angle',
          // 	params: {
          // 		correction: prjM.decode(f.Fltr.prjM),
          // 		focalLength: f.Fltr.focL,
          // 		cropFactor: f.Fltr.CrpF,
          // 		imageScale: f.Fltr.imgS,
          // 		imageX: f.Fltr.imgX,
          // 		imageY: f.Fltr.imgY,
          // 	},
          // };
          case "HsbP":
            return Object.assign(Object.assign({}, base), { type: "hsb/hsl", filter: {
              inputMode: descriptor_1.ClrS.decode(f.Fltr.Inpt),
              rowOrder: descriptor_1.ClrS.decode(f.Fltr.Otpt)
            } });
          case "oilPaint":
            return Object.assign(Object.assign({}, base), { type: "oil paint", filter: {
              lightingOn: f.Fltr.lightingOn,
              stylization: f.Fltr.stylization,
              cleanliness: f.Fltr.cleanliness,
              brushScale: f.Fltr.brushScale,
              microBrush: f.Fltr.microBrush,
              lightDirection: f.Fltr.LghD,
              specularity: f.Fltr.specularity
            } });
          case "LqFy":
            {
              return Object.assign(Object.assign({}, base), { type: "liquify", filter: {
                liquifyMesh: f.Fltr.LqMe
              } });
            }
            ;
          case "perspectiveWarpTransform":
            {
              return Object.assign(Object.assign({}, base), { type: "perspective warp", filter: {
                vertices: f.Fltr.vertices.map(hrznVrtcToPoint),
                warpedVertices: f.Fltr.warpedVertices.map(hrznVrtcToPoint),
                quads: f.Fltr.quads.map((q) => q.indices)
              } });
            }
            ;
          case "Crvs":
            {
              return Object.assign(Object.assign({}, base), { type: "curves", filter: Object.assign(Object.assign({}, f.Fltr.presetKind !== void 0 ? { presetKind: descriptor_1.presetKindType.decode(f.Fltr.presetKind) } : {}), f.Fltr.Adjs ? {
                adjustments: f.Fltr.Adjs.map((a) => {
                  const channels = a.Chnl.map(descriptor_1.Chnl.decode);
                  if (a["Crv "]) {
                    return {
                      channels,
                      curve: a["Crv "].map((c) => {
                        const point = { x: c.Hrzn, y: c.Vrtc };
                        if (c.Cnty)
                          point.curved = true;
                        return point;
                      })
                    };
                  } else if (a.Mpng) {
                    return { channels, values: a.Mpng };
                  } else {
                    throw new Error(`Unknown curve adjustment`);
                  }
                })
              } : {}) });
            }
            ;
          case "Lvls":
            {
              const adjustments = f.Fltr.Adjs;
              const isKnown = (obj, keys) => Object.keys(obj).every((k) => keys.indexOf(k) !== -1);
              if (!isKnown(f.Fltr, levelsFilterKeys) || adjustments && !adjustments.every((a) => isKnown(a, levelsFilterAdjustmentKeys))) {
                if (reader.throwForMissingFeatures)
                  throw new Error("Unknown levels filter settings");
                reader.logMissingFeatures && reader.log(`Skipped levels smart filter with unknown settings`);
                return void 0;
              }
              return Object.assign(Object.assign({}, base), { type: "levels", filter: Object.assign(Object.assign({}, f.Fltr.presetKind !== void 0 ? { presetKind: descriptor_1.presetKindType.decode(f.Fltr.presetKind) } : {}), adjustments ? {
                adjustments: adjustments.map((a) => {
                  const result = { channels: a.Chnl.map(descriptor_1.Chnl.decode) };
                  if (a.Inpt) {
                    result.shadowInput = a.Inpt[0];
                    result.highlightInput = a.Inpt[1];
                  }
                  if (a.Otpt) {
                    result.shadowOutput = a.Otpt[0];
                    result.highlightOutput = a.Otpt[1];
                  }
                  if (a["Gmm "] !== void 0)
                    result.midtoneInput = a["Gmm "];
                  return result;
                })
              } : {}) });
            }
            ;
          case "BrgC":
            {
              return Object.assign(Object.assign({}, base), { type: "brightness/contrast", filter: {
                brightness: f.Fltr.Brgh,
                contrast: f.Fltr.Cntr,
                useLegacy: !!f.Fltr.useLegacy
              } });
            }
            ;
          default:
            if (reader.throwForMissingFeatures) {
              throw new Error(`Unknown filter classId: ${f.Fltr._classID}`);
            }
            reader.logMissingFeatures && reader.log(`Unhandled smart filter: ${f.Fltr._classID} (${f["Nm  "]})`);
            return void 0;
        }
      } else {
        switch (f.filterID) {
          case 1098281575:
            return Object.assign(Object.assign({}, base), { type: "average" });
          case 1114403360:
            return Object.assign(Object.assign({}, base), { type: "blur" });
          case 1114403405:
            return Object.assign(Object.assign({}, base), { type: "blur more" });
          case 1148416099:
            return Object.assign(Object.assign({}, base), { type: "despeckle" });
          case 1180922912:
            return Object.assign(Object.assign({}, base), { type: "facet" });
          case 1181902701:
            return Object.assign(Object.assign({}, base), { type: "fragment" });
          case 1399353968:
            return Object.assign(Object.assign({}, base), { type: "sharpen" });
          case 1399353925:
            return Object.assign(Object.assign({}, base), { type: "sharpen edges" });
          case 1399353933:
            return Object.assign(Object.assign({}, base), { type: "sharpen more" });
          case 1181639749:
            return Object.assign(Object.assign({}, base), { type: "find edges" });
          case 1399616122:
            return Object.assign(Object.assign({}, base), { type: "solarize" });
          case 1314149187:
            return Object.assign(Object.assign({}, base), { type: "ntsc colors" });
          case 1231976050:
            return Object.assign(Object.assign({}, base), { type: "invert" });
          default:
            if (reader.throwForMissingFeatures) {
              throw new Error(`Unknown filterID: ${f.filterID}`);
            }
            reader.logMissingFeatures && reader.log(`Unhandled smart filter: ${f.filterID} (${f["Nm  "]})`);
            return void 0;
        }
      }
    }
    function parseFilterFX(desc, reader) {
      return {
        enabled: desc.enab,
        validAtPosition: desc.validAtPosition,
        maskEnabled: desc.filterMaskEnable,
        maskLinked: desc.filterMaskLinked,
        maskExtendWithWhite: desc.filterMaskExtendWithWhite,
        list: desc.filterFXList.map((x) => parseFilterFXItem(x, reader)).filter((x) => !!x)
      };
    }
    function uvRadius(t) {
      return (0, descriptor_1.unitsValue)(t.radius, "radius");
    }
    function serializeFilterFXItem(f) {
      const base = {
        _name: "",
        _classID: "filterFX",
        "Nm  ": f.name,
        blendOptions: {
          _name: "",
          _classID: "blendOptions",
          Opct: (0, descriptor_1.unitsPercentF)(f.opacity),
          "Md  ": descriptor_1.BlnM.encode(f.blendMode)
        },
        enab: f.enabled,
        hasoptions: f.hasOptions,
        FrgC: (0, descriptor_1.serializeColor)(f.foregroundColor),
        BckC: (0, descriptor_1.serializeColor)(f.backgroundColor)
      };
      switch (f.type) {
        case "average":
          return Object.assign(Object.assign({}, base), { filterID: 1098281575 });
        case "blur":
          return Object.assign(Object.assign({}, base), { filterID: 1114403360 });
        case "blur more":
          return Object.assign(Object.assign({}, base), { filterID: 1114403405 });
        case "box blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Box Blur",
            _classID: "boxblur",
            "Rds ": uvRadius(f.filter)
          }, filterID: 697 });
        case "gaussian blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            // _name: '高斯模糊', // Testing
            _name: "Gaussian Blur",
            _classID: "GsnB",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1198747202 });
        case "motion blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Motion Blur",
            _classID: "MtnB",
            Angl: f.filter.angle,
            Dstn: (0, descriptor_1.unitsValue)(f.filter.distance, "distance")
          }, filterID: 1299476034 });
        case "radial blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Radial Blur",
            _classID: "RdlB",
            Amnt: f.filter.amount,
            BlrM: descriptor_1.BlrM.encode(f.filter.method),
            BlrQ: descriptor_1.BlrQ.encode(f.filter.quality)
          }, filterID: 1382313026 });
        case "shape blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Shape Blur",
            _classID: "shapeBlur",
            "Rds ": uvRadius(f.filter),
            customShape: {
              _name: "",
              _classID: "customShape",
              "Nm  ": f.filter.customShape.name,
              Idnt: f.filter.customShape.id
            }
          }, filterID: 702 });
        case "smart blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Smart Blur",
            _classID: "SmrB",
            "Rds ": f.filter.radius,
            Thsh: f.filter.threshold,
            SmBQ: descriptor_1.SmBQ.encode(f.filter.quality),
            SmBM: descriptor_1.SmBM.encode(f.filter.mode)
          }, filterID: 1399681602 });
        case "surface blur":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Surface Blur",
            _classID: "surfaceBlur",
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold
          }, filterID: 701 });
        case "displace":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Displace",
            _classID: "Dspl",
            HrzS: f.filter.horizontalScale,
            VrtS: f.filter.verticalScale,
            DspM: descriptor_1.DspM.encode(f.filter.displacementMap),
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            DspF: {
              sig: f.filter.displacementFile.signature,
              path: f.filter.displacementFile.path
            }
          }, filterID: 1148416108 });
        case "pinch":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Pinch",
            _classID: "Pnch",
            Amnt: f.filter.amount
          }, filterID: 1349411688 });
        case "polar coordinates":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Polar Coordinates",
            _classID: "Plr ",
            Cnvr: descriptor_1.Cnvr.encode(f.filter.conversion)
          }, filterID: 1349284384 });
        case "ripple":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Ripple",
            _classID: "Rple",
            Amnt: f.filter.amount,
            RplS: descriptor_1.RplS.encode(f.filter.size)
          }, filterID: 1383099493 });
        case "shear":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Shear",
            _classID: "Shr ",
            ShrP: f.filter.shearPoints.map((p) => ({ _name: "", _classID: "Pnt ", Hrzn: p.x, Vrtc: p.y })),
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            ShrS: f.filter.shearStart,
            ShrE: f.filter.shearEnd
          }, filterID: 1399353888 });
        case "spherize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Spherize",
            _classID: "Sphr",
            Amnt: f.filter.amount,
            SphM: descriptor_1.SphM.encode(f.filter.mode)
          }, filterID: 1399875698 });
        case "twirl":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Twirl",
            _classID: "Twrl",
            Angl: f.filter.angle
          }, filterID: 1417114220 });
        case "wave":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Wave",
            _classID: "Wave",
            Wvtp: descriptor_1.Wvtp.encode(f.filter.type),
            NmbG: f.filter.numberOfGenerators,
            WLMn: f.filter.wavelength.min,
            WLMx: f.filter.wavelength.max,
            AmMn: f.filter.amplitude.min,
            AmMx: f.filter.amplitude.max,
            SclH: f.filter.scale.x,
            SclV: f.filter.scale.y,
            UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
            RndS: f.filter.randomSeed
          }, filterID: 1466005093 });
        case "zigzag":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "ZigZag",
            _classID: "ZgZg",
            Amnt: f.filter.amount,
            NmbR: f.filter.ridges,
            ZZTy: descriptor_1.ZZTy.encode(f.filter.style)
          }, filterID: 1516722791 });
        case "add noise":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Add Noise",
            _classID: "AdNs",
            Dstr: descriptor_1.Dstr.encode(f.filter.distribution),
            Nose: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            Mnch: f.filter.monochromatic,
            FlRs: f.filter.randomSeed
          }, filterID: 1097092723 });
        case "despeckle":
          return Object.assign(Object.assign({}, base), { filterID: 1148416099 });
        case "dust and scratches":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Dust & Scratches",
            _classID: "DstS",
            "Rds ": f.filter.radius,
            Thsh: f.filter.threshold
          }, filterID: 1148417107 });
        case "median":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Median",
            _classID: "Mdn ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1298427424 });
        case "reduce noise":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Reduce Noise",
            _classID: "denoise",
            ClNs: (0, descriptor_1.unitsPercentF)(f.filter.reduceColorNoise),
            Shrp: (0, descriptor_1.unitsPercentF)(f.filter.sharpenDetails),
            removeJPEGArtifact: f.filter.removeJpegArtifact,
            channelDenoise: f.filter.channelDenoise.map((c) => Object.assign({ _name: "", _classID: "channelDenoiseParams", Chnl: c.channels.map((i) => descriptor_1.Chnl.encode(i)), Amnt: c.amount }, c.preserveDetails ? { EdgF: c.preserveDetails } : {})),
            preset: f.filter.preset
          }, filterID: 633 });
        case "color halftone":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Color Halftone",
            _classID: "ClrH",
            "Rds ": f.filter.radius,
            Ang1: f.filter.angle1,
            Ang2: f.filter.angle2,
            Ang3: f.filter.angle3,
            Ang4: f.filter.angle4
          }, filterID: 1131180616 });
        case "crystallize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Crystallize",
            _classID: "Crst",
            ClSz: f.filter.cellSize,
            FlRs: f.filter.randomSeed
          }, filterID: 1131574132 });
        case "facet":
          return Object.assign(Object.assign({}, base), { filterID: 1180922912 });
        case "fragment":
          return Object.assign(Object.assign({}, base), { filterID: 1181902701 });
        case "mezzotint":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Mezzotint",
            _classID: "Mztn",
            MztT: descriptor_1.MztT.encode(f.filter.type),
            FlRs: f.filter.randomSeed
          }, filterID: 1299870830 });
        case "mosaic":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Mosaic",
            _classID: "Msc ",
            ClSz: (0, descriptor_1.unitsValue)(f.filter.cellSize, "cellSize")
          }, filterID: 1299407648 });
        case "pointillize":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Pointillize",
            _classID: "Pntl",
            ClSz: f.filter.cellSize,
            FlRs: f.filter.randomSeed
          }, filterID: 1349416044 });
        case "clouds":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Clouds",
            _classID: "Clds",
            FlRs: f.filter.randomSeed
          }, filterID: 1131177075 });
        case "difference clouds":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Difference Clouds",
            _classID: "DfrC",
            FlRs: f.filter.randomSeed
          }, filterID: 1147564611 });
        case "fibers":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Fibers",
            _classID: "Fbrs",
            Vrnc: f.filter.variance,
            Strg: f.filter.strength,
            RndS: f.filter.randomSeed
          }, filterID: 1180856947 });
        case "lens flare":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Lens Flare",
            _classID: "LnsF",
            Brgh: f.filter.brightness,
            FlrC: {
              _name: "",
              _classID: "Pnt ",
              Hrzn: f.filter.position.x,
              Vrtc: f.filter.position.y
            },
            "Lns ": descriptor_1.Lns.encode(f.filter.lensType)
          }, filterID: 1282306886 });
        case "sharpen":
          return Object.assign(Object.assign({}, base), { filterID: 1399353968 });
        case "sharpen edges":
          return Object.assign(Object.assign({}, base), { filterID: 1399353925 });
        case "sharpen more":
          return Object.assign(Object.assign({}, base), { filterID: 1399353933 });
        case "smart sharpen":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Smart Sharpen",
            _classID: "smartSharpen",
            Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold,
            Angl: f.filter.angle,
            moreAccurate: f.filter.moreAccurate,
            blur: descriptor_1.blurType.encode(f.filter.blur),
            preset: f.filter.preset,
            sdwM: {
              _name: "Parameters",
              _classID: "adaptCorrectTones",
              Amnt: (0, descriptor_1.unitsPercentF)(f.filter.shadow.fadeAmount),
              Wdth: (0, descriptor_1.unitsPercentF)(f.filter.shadow.tonalWidth),
              "Rds ": f.filter.shadow.radius
            },
            hglM: {
              _name: "Parameters",
              _classID: "adaptCorrectTones",
              Amnt: (0, descriptor_1.unitsPercentF)(f.filter.highlight.fadeAmount),
              Wdth: (0, descriptor_1.unitsPercentF)(f.filter.highlight.tonalWidth),
              "Rds ": f.filter.highlight.radius
            }
          }, filterID: 698 });
        case "unsharp mask":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Unsharp Mask",
            _classID: "UnsM",
            Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
            "Rds ": uvRadius(f.filter),
            Thsh: f.filter.threshold
          }, filterID: 1433301837 });
        case "diffuse":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Diffuse",
            _classID: "Dfs ",
            "Md  ": descriptor_1.DfsM.encode(f.filter.mode),
            FlRs: f.filter.randomSeed
          }, filterID: 1147564832 });
        case "emboss":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Emboss",
            _classID: "Embs",
            Angl: f.filter.angle,
            Hght: f.filter.height,
            Amnt: f.filter.amount
          }, filterID: 1164796531 });
        case "extrude":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Extrude",
            _classID: "Extr",
            ExtS: f.filter.size,
            ExtD: f.filter.depth,
            ExtF: f.filter.solidFrontFaces,
            ExtM: f.filter.maskIncompleteBlocks,
            ExtT: descriptor_1.ExtT.encode(f.filter.type),
            ExtR: descriptor_1.ExtR.encode(f.filter.depthMode),
            FlRs: f.filter.randomSeed
          }, filterID: 1165522034 });
        case "find edges":
          return Object.assign(Object.assign({}, base), { filterID: 1181639749 });
        case "solarize":
          return Object.assign(Object.assign({}, base), { filterID: 1399616122 });
        case "tiles":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Tiles",
            _classID: "Tls ",
            TlNm: f.filter.numberOfTiles,
            TlOf: f.filter.maximumOffset,
            FlCl: descriptor_1.FlCl.encode(f.filter.fillEmptyAreaWith),
            FlRs: f.filter.randomSeed
          }, filterID: 1416393504 });
        case "trace contour":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Trace Contour",
            _classID: "TrcC",
            "Lvl ": f.filter.level,
            "Edg ": descriptor_1.CntE.encode(f.filter.edge)
          }, filterID: 1416782659 });
        case "wind":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Wind",
            _classID: "Wnd ",
            WndM: descriptor_1.WndM.encode(f.filter.method),
            Drct: descriptor_1.Drct.encode(f.filter.direction)
          }, filterID: 1466852384 });
        case "de-interlace":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "De-Interlace",
            _classID: "Dntr",
            IntE: descriptor_1.IntE.encode(f.filter.eliminate),
            IntC: descriptor_1.IntC.encode(f.filter.newFieldsBy)
          }, filterID: 1148089458 });
        case "ntsc colors":
          return Object.assign(Object.assign({}, base), { filterID: 1314149187 });
        case "invert":
          return Object.assign(Object.assign({}, base), { filterID: 1231976050 });
        case "custom":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Custom",
            _classID: "Cstm",
            "Scl ": f.filter.scale,
            Ofst: f.filter.offset,
            Mtrx: f.filter.matrix
          }, filterID: 1131639917 });
        case "high pass":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "High Pass",
            _classID: "HghP",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1214736464 });
        case "maximum":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Maximum",
            _classID: "Mxm ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1299737888 });
        case "minimum":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Minimum",
            _classID: "Mnm ",
            "Rds ": uvRadius(f.filter)
          }, filterID: 1299082528 });
        case "offset":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Offset",
            _classID: "Ofst",
            Hrzn: f.filter.horizontal,
            Vrtc: f.filter.vertical,
            "Fl  ": descriptor_1.FlMd.encode(f.filter.undefinedAreas)
          }, filterID: 1332114292 });
        case "puppet":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Rigid Transform",
            _classID: "rigidTransform",
            "null": ["Ordn.Trgt"],
            // target layer reference
            rigidType: f.filter.rigidType,
            puppetShapeList: (f.filter.puppetShapeList || []).map((p) => ({
              _name: "",
              _classID: "puppetShape",
              rigidType: p.rigidType,
              VrsM: 1,
              // version major
              VrsN: 0,
              // version minor
              originalVertexArray: toUint8(new Float32Array(pointsToArray(p.originalVertexArray))),
              deformedVertexArray: toUint8(new Float32Array(pointsToArray(p.deformedVertexArray))),
              indexArray: toUint8(new Uint32Array(p.indexArray)),
              pinOffsets: pointsToArray(p.pinOffsets),
              posFinalPins: pointsToArray(p.posFinalPins),
              pinVertexIndices: p.pinVertexIndices,
              PinP: pointsToArray(p.pinPosition),
              PnRt: p.pinRotation,
              PnOv: p.pinOverlay,
              PnDp: p.pinDepth,
              meshQuality: p.meshQuality,
              meshExpansion: p.meshExpansion,
              meshRigidity: p.meshRigidity,
              imageResolution: p.imageResolution,
              meshBoundaryPath: {
                _name: "",
                _classID: "pathClass",
                pathComponents: p.meshBoundaryPath.pathComponents.map((c) => ({
                  _name: "",
                  _classID: "PaCm",
                  shapeOperation: `shapeOperation.${c.shapeOperation}`,
                  SbpL: c.paths.map((path) => ({
                    _name: "",
                    _classID: "Sbpl",
                    Clsp: path.closed,
                    "Pts ": path.points.map((pt) => ({
                      _name: "",
                      _classID: "Pthp",
                      Anch: pointToHrznVrtc(pt.anchor),
                      "Fwd ": pointToHrznVrtc(pt.forward),
                      "Bwd ": pointToHrznVrtc(pt.backward),
                      Smoo: pt.smooth
                    }))
                  }))
                }))
              },
              selectedPin: p.selectedPin
            })),
            PuX0: f.filter.bounds[0].x,
            PuX1: f.filter.bounds[1].x,
            PuX2: f.filter.bounds[2].x,
            PuX3: f.filter.bounds[3].x,
            PuY0: f.filter.bounds[0].y,
            PuY1: f.filter.bounds[1].y,
            PuY2: f.filter.bounds[2].y,
            PuY3: f.filter.bounds[3].y
          }, filterID: 991 });
        case "oil paint plugin": {
          const params = {};
          for (let i = 0; i < f.filter.parameters.length; i++) {
            const { name, value } = f.filter.parameters[i];
            const suffix = `${fromAtoZ[Math.floor(i / fromAtoZ.length)]}${fromAtoZ[i % fromAtoZ.length]}`;
            params[`PN${suffix}`] = name;
            params[`PT${suffix}`] = 0;
            params[`PF${suffix}`] = value;
          }
          return Object.assign(Object.assign({}, base), { Fltr: Object.assign({ _name: "Oil Paint Plugin", _classID: "PbPl", KnNm: f.filter.name, GpuY: f.filter.gpu, LIWy: f.filter.lighting, FPth: "1" }, params), filterID: 1348620396 });
        }
        case "oil paint":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Oil Paint",
            _classID: "oilPaint",
            lightingOn: f.filter.lightingOn,
            stylization: f.filter.stylization,
            cleanliness: f.filter.cleanliness,
            brushScale: f.filter.brushScale,
            microBrush: f.filter.microBrush,
            LghD: f.filter.lightDirection,
            specularity: f.filter.specularity
          }, filterID: 1122 });
        case "liquify":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Liquify",
            _classID: "LqFy",
            LqMe: f.filter.liquifyMesh
          }, filterID: 1282492025 });
        case "perspective warp":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Perspective Warp",
            _classID: "perspectiveWarpTransform",
            vertices: f.filter.vertices.map(pointToHrznVrtc),
            warpedVertices: f.filter.warpedVertices.map(pointToHrznVrtc),
            quads: f.filter.quads.map((indices) => ({ _name: "", _classID: "quadIndices", indices }))
          }, filterID: 442 });
        case "curves":
          return Object.assign(Object.assign({}, base), { Fltr: Object.assign(Object.assign({ _name: "Curves", _classID: "Crvs" }, f.filter.presetKind !== void 0 ? { presetKind: descriptor_1.presetKindType.encode(f.filter.presetKind) } : {}), f.filter.adjustments ? {
            Adjs: f.filter.adjustments.map((a) => "curve" in a ? {
              _name: "",
              _classID: "CrvA",
              Chnl: a.channels.map(descriptor_1.Chnl.encode),
              "Crv ": a.curve.map((c) => Object.assign({ _name: "", _classID: "Pnt ", Hrzn: c.x, Vrtc: c.y }, c.curved ? { Cnty: true } : {}))
            } : {
              _name: "",
              _classID: "CrvA",
              Chnl: a.channels.map(descriptor_1.Chnl.encode),
              Mpng: a.values
            })
          } : {}), filterID: 1131574899 });
        case "levels":
          return Object.assign(Object.assign({}, base), { Fltr: Object.assign(Object.assign({ _name: "Levels", _classID: "Lvls" }, f.filter.presetKind !== void 0 ? { presetKind: descriptor_1.presetKindType.encode(f.filter.presetKind) } : {}), f.filter.adjustments ? {
            Adjs: f.filter.adjustments.map((a) => {
              var _a, _b, _c, _d;
              const adjustment = { _name: "", _classID: "LvlA", Chnl: a.channels.map(descriptor_1.Chnl.encode) };
              if (a.shadowInput !== void 0 || a.highlightInput !== void 0) {
                adjustment.Inpt = [Math.round((_a = a.shadowInput) !== null && _a !== void 0 ? _a : 0), Math.round((_b = a.highlightInput) !== null && _b !== void 0 ? _b : 255)];
              }
              if (a.shadowOutput !== void 0 || a.highlightOutput !== void 0) {
                adjustment.Otpt = [Math.round((_c = a.shadowOutput) !== null && _c !== void 0 ? _c : 0), Math.round((_d = a.highlightOutput) !== null && _d !== void 0 ? _d : 255)];
              }
              if (a.midtoneInput !== void 0)
                adjustment["Gmm "] = a.midtoneInput;
              return adjustment;
            })
          } : {}), filterID: 1282829427 });
        case "camera raw":
          return Object.assign(Object.assign({}, base), { Fltr: serializeCameraRawSettings(f.filter), filterID: cameraRawFilterID });
        case "brightness/contrast":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "Brightness/Contrast",
            _classID: "BrgC",
            Brgh: f.filter.brightness,
            Cntr: f.filter.contrast,
            useLegacy: !!f.filter.useLegacy
          }, filterID: 1114793795 });
        case "hsb/hsl":
          return Object.assign(Object.assign({}, base), { Fltr: {
            _name: "HSB/HSL",
            _classID: "HsbP",
            Inpt: descriptor_1.ClrS.encode(f.filter.inputMode),
            Otpt: descriptor_1.ClrS.encode(f.filter.rowOrder)
          }, filterID: 1215521360 });
        default:
          throw new Error(`Unknown filter type: ${f.type}`);
      }
    }
    function getWarpFromPlacedLayer(placed) {
      if (placed.warp)
        return placed.warp;
      if (!placed.width || !placed.height)
        throw new Error("You must provide width and height of the linked image in placedLayer");
      const w = placed.width;
      const h = placed.height;
      const x0 = 0, x1 = w / 3, x2 = w * 2 / 3, x3 = w;
      const y0 = 0, y1 = h / 3, y2 = h * 2 / 3, y3 = h;
      return {
        style: "custom",
        value: 0,
        perspective: 0,
        perspectiveOther: 0,
        rotate: "horizontal",
        bounds: {
          top: { value: 0, units: "Pixels" },
          left: { value: 0, units: "Pixels" },
          bottom: { value: h, units: "Pixels" },
          right: { value: w, units: "Pixels" }
        },
        uOrder: 4,
        vOrder: 4,
        customEnvelopeWarp: {
          meshPoints: [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x2, y: y0 },
            { x: x3, y: y0 },
            { x: x0, y: y1 },
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x3, y: y1 },
            { x: x0, y: y2 },
            { x: x1, y: y2 },
            { x: x2, y: y2 },
            { x: x3, y: y2 },
            { x: x0, y: y3 },
            { x: x1, y: y3 },
            { x: x2, y: y3 },
            { x: x3, y: y3 }
          ]
        }
      };
    }
    addHandler(
      "SoLd",
      (target) => !!target.placedLayer && !target.placedLayer.external,
      // linked smart objects are stored in SoLE
      (reader, target, left) => {
        if ((0, psdReader_1.readSignature)(reader) !== "soLD")
          throw new Error(`Invalid SoLd type`);
        const version = (0, psdReader_1.readInt32)(reader);
        if (version !== 4 && version !== 5)
          throw new Error(`Invalid SoLd version`);
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
        target.placedLayer = {
          id: desc.Idnt,
          placed: desc.placed,
          type: placedLayerTypes[desc.Type],
          pageNumber: desc.PgNm,
          totalPages: desc.totalPages,
          frameStep: (0, descriptor_1.frac)(desc.frameStep),
          duration: (0, descriptor_1.frac)(desc.duration),
          frameCount: desc.frameCount,
          transform: desc.Trnf,
          width: desc["Sz  "].Wdth,
          height: desc["Sz  "].Hght,
          resolution: (0, descriptor_1.parseUnits)(desc.Rslt),
          warp: parseWarp(desc.quiltWarp || desc.warp)
        };
        if (desc.nonAffineTransform && desc.nonAffineTransform.some((x, i) => x !== desc.Trnf[i])) {
          target.placedLayer.nonAffineTransform = desc.nonAffineTransform;
        }
        if (desc.Crop)
          target.placedLayer.crop = desc.Crop;
        if (desc.comp)
          target.placedLayer.comp = desc.comp;
        if (desc.compInfo) {
          target.placedLayer.compInfo = {
            compID: desc.compInfo.compID,
            originalCompID: desc.compInfo.originalCompID
          };
        }
        if (desc.filterFX)
          target.placedLayer.filter = parseFilterFX(desc.filterFX, reader);
        if (desc.Impr)
          target.placedLayer.imported = true;
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        var _a, _b;
        (0, psdWriter_1.writeSignature)(writer, "soLD");
        (0, psdWriter_1.writeInt32)(writer, 4);
        const placed = target.placedLayer;
        if (!placed.id || typeof placed.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
          throw new Error("Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
        }
        const placedType = placedLayerTypes.indexOf(placed.type);
        if (placedType === -1)
          throw new Error("Invalid placedLayer type");
        const warp = getWarpFromPlacedLayer(placed);
        const bounds = warp.bounds;
        const width = placed.width || (bounds ? bounds.right.value - bounds.left.value : 0);
        const height = placed.height || (bounds ? bounds.bottom.value - bounds.top.value : 0);
        const desc = Object.assign(Object.assign({ Idnt: placed.id, placed: (_a = placed.placed) !== null && _a !== void 0 ? _a : placed.id, PgNm: placed.pageNumber || 1, totalPages: placed.totalPages || 1 }, placed.crop ? { Crop: placed.crop } : {}), {
          frameStep: placed.frameStep || { numerator: 0, denominator: 600 },
          duration: placed.duration || { numerator: 0, denominator: 600 },
          frameCount: placed.frameCount || 0,
          Annt: 16,
          Type: placedType,
          Trnf: placed.transform,
          nonAffineTransform: (_b = placed.nonAffineTransform) !== null && _b !== void 0 ? _b : placed.transform,
          // quiltWarp: {} as any,
          warp: encodeWarp(warp),
          "Sz  ": {
            _name: "",
            _classID: "Pnt ",
            Wdth: width,
            Hght: height
          },
          Rslt: placed.resolution ? (0, descriptor_1.unitsValue)(placed.resolution, "resolution") : { units: "Density", value: 72 }
        });
        if (placed.filter) {
          desc.filterFX = {
            _name: "",
            _classID: "filterFXStyle",
            enab: placed.filter.enabled,
            validAtPosition: placed.filter.validAtPosition,
            filterMaskEnable: placed.filter.maskEnabled,
            filterMaskLinked: placed.filter.maskLinked,
            filterMaskExtendWithWhite: placed.filter.maskExtendWithWhite,
            filterFXList: placed.filter.list.map((f) => serializeFilterFXItem(f))
          };
        }
        if (placed.warp && isQuiltWarp(placed.warp)) {
          const quiltWarp = encodeWarp(placed.warp);
          desc.quiltWarp = quiltWarp;
          desc.warp = {
            warpStyle: "warpStyle.warpNone",
            warpValue: quiltWarp.warpValue,
            warpPerspective: quiltWarp.warpPerspective,
            warpPerspectiveOther: quiltWarp.warpPerspectiveOther,
            warpRotate: quiltWarp.warpRotate,
            bounds: quiltWarp.bounds,
            uOrder: quiltWarp.uOrder,
            vOrder: quiltWarp.vOrder
          };
        } else {
          delete desc.quiltWarp;
        }
        if (placed.comp)
          desc.comp = placed.comp;
        if (placed.compInfo)
          desc.compInfo = placed.compInfo;
        if (placed.imported)
          desc.Impr = {};
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, desc.quiltWarp ? "quiltWarp" : "warp");
      }
    );
    var soLdHandler = exports.infoHandlersMap["SoLd"];
    addHandler(
      "SoLE",
      // linked smart object (Photoshop doesn't write PlLd for these)
      // linked smart object (Photoshop doesn't write PlLd for these)
      (target) => {
        var _a;
        return !!((_a = target.placedLayer) === null || _a === void 0 ? void 0 : _a.external);
      },
      (reader, target, left, psd, imageResources) => {
        soLdHandler.read(reader, target, left, psd, imageResources);
        target.placedLayer.external = true;
      },
      soLdHandler.write
    );
    addHandler("fxrp", hasKey("referencePoint"), (reader, target) => {
      target.referencePoint = {
        x: (0, psdReader_1.readFloat64)(reader),
        y: (0, psdReader_1.readFloat64)(reader)
      };
    }, (writer, target) => {
      (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.x);
      (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.y);
    });
    function createGlobalLayerInfoHandler(key, bitsPerChannel) {
      addHandler(key, () => false, (reader, _target, left, psd, imageResources) => {
        var _a;
        if (!reader.layersInGlobalInfo && (psd.bitsPerChannel === bitsPerChannel || !((_a = psd.children) === null || _a === void 0 ? void 0 : _a.length))) {
          const sectionLayers = psd.children;
          psd.children = [];
          try {
            (0, psdReader_1.readLayerInfo)(reader, psd, imageResources);
          } catch (e) {
            psd.children = sectionLayers;
            throw e;
          }
          reader.layersInGlobalInfo = true;
        }
        (0, psdReader_1.skipBytes)(reader, left());
      }, () => {
      });
    }
    createGlobalLayerInfoHandler("Lr16", 16);
    createGlobalLayerInfoHandler("Lr32", 32);
    createGlobalLayerInfoHandler("Layr", void 0);
    for (const key of ["Mtrn", "Mt16", "Mt32"]) {
      addHandler(key, () => false, (reader, _target, left) => {
        reader.globalAlpha = true;
        (0, psdReader_1.skipBytes)(reader, left());
      }, () => {
      });
    }
    addHandler("LMsk", hasKey("userMask"), (reader, target) => {
      target.userMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 100
      };
      const flag = (0, psdReader_1.readUint8)(reader);
      if (flag !== 128)
        throw new Error("Invalid flag value");
      (0, psdReader_1.skipBytes)(reader, 1);
    }, (writer, target) => {
      const userMask = target.userMask;
      (0, psdWriter_1.writeColor)(writer, userMask.colorSpace);
      (0, psdWriter_1.writeUint16)(writer, Math.round((0, helpers_1.clamp)(userMask.opacity, 0, 1) * 100));
      (0, psdWriter_1.writeUint8)(writer, 128);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    addHandler(
      "Patt",
      // 'Pat2' and 'Pat3' (16 and 32 bit documents) are aliases, patterns are always written as 8 bit
      // 'Pat2' and 'Pat3' (16 and 32 bit documents) are aliases, patterns are always written as 8 bit
      (target) => !!(target.patterns && target.patterns.length > 0),
      (reader, target, left) => {
        while (left() > 0) {
          const pattern = (0, psdReader_1.readPatternSafe)(reader);
          if (!pattern)
            continue;
          if (target.patterns === void 0)
            target.patterns = [];
          target.patterns.push(pattern);
        }
      },
      (writer, target, _, _options) => {
        const patterns = target.patterns || [];
        for (const pattern of patterns) {
          (0, psdWriter_1.writePattern)(writer, pattern);
        }
      }
    );
    addHandlerAlias("Pat2", "Patt");
    addHandlerAlias("Pat3", "Patt");
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "CAI ",
        // Content Authenticity Initiative / C2PA provenance metadata
        // Content Authenticity Initiative / C2PA provenance metadata
        (target) => target._CAI_ !== void 0,
        (reader, target, left) => {
          target._CAI_ = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._CAI_);
        }
      );
    }
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "OCIO",
        // Document color management info
        // Document color management info
        (target) => target._OCIO !== void 0,
        (reader, target, left) => {
          target._OCIO = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._OCIO);
        }
      );
    }
    if (helpers_1.MOCK_HANDLERS) {
      addHandler(
        "GenI",
        // Generative Fill / generative AI (Firefly) features
        // Generative Fill / generative AI (Firefly) features
        (target) => target._GenI !== void 0,
        (reader, target, left) => {
          target._GenI = (0, psdReader_1.readBytes)(reader, left());
        },
        (writer, target) => {
          (0, psdWriter_1.writeBytes)(writer, target._GenI);
        }
      );
    }
    function readRect(reader) {
      const top = (0, psdReader_1.readInt32)(reader);
      const left = (0, psdReader_1.readInt32)(reader);
      const bottom = (0, psdReader_1.readInt32)(reader);
      const right = (0, psdReader_1.readInt32)(reader);
      return { top, left, bottom, right };
    }
    function writeRect(writer, rect) {
      (0, psdWriter_1.writeInt32)(writer, rect.top);
      (0, psdWriter_1.writeInt32)(writer, rect.left);
      (0, psdWriter_1.writeInt32)(writer, rect.bottom);
      (0, psdWriter_1.writeInt32)(writer, rect.right);
    }
    addHandler("Anno", (target) => target.annotations !== void 0, (reader, target, left) => {
      const major = (0, psdReader_1.readUint16)(reader);
      const minor = (0, psdReader_1.readUint16)(reader);
      if (major !== 2 || minor !== 1)
        throw new Error("Invalid Anno version");
      const count = (0, psdReader_1.readUint32)(reader);
      const annotations = [];
      for (let i = 0; i < count; i++) {
        const recordStart = reader.offset;
        const length = (0, psdReader_1.readUint32)(reader);
        const type = (0, psdReader_1.readSignature)(reader);
        const open = !!(0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.readUint8)(reader);
        (0, psdReader_1.readUint16)(reader);
        const iconLocation = readRect(reader);
        const popupLocation = readRect(reader);
        const color = (0, psdReader_1.readColor)(reader);
        const author = (0, psdReader_1.readPascalString)(reader, 2);
        const name = (0, psdReader_1.readPascalString)(reader, 2);
        const date = (0, psdReader_1.readPascalString)(reader, 2);
        (0, psdReader_1.readUint32)(reader);
        (0, psdReader_1.readSignature)(reader);
        const dataLength = (0, psdReader_1.readUint32)(reader);
        let data;
        if (type === "txtA") {
          const dataStart = reader.offset;
          if (dataLength >= 2 && (0, psdReader_1.readUint16)(reader) === 65279) {
            data = (0, psdReader_1.readUnicodeStringWithLength)(reader, Math.floor((dataLength - 2) / 2));
          } else {
            reader.offset = dataStart;
            data = (0, psdReader_1.readAsciiString)(reader, dataLength);
          }
          data = data.replace(/\r/g, "\n");
        } else if (type === "sndA") {
          data = (0, psdReader_1.readBytes)(reader, dataLength);
        } else {
          throw new Error("Unknown annotation type");
        }
        annotations.push({
          type: type === "txtA" ? "text" : "sound",
          open,
          iconLocation,
          popupLocation,
          color,
          author,
          name,
          date,
          data
        });
        if (length >= reader.offset - recordStart)
          reader.offset = recordStart + length;
      }
      target.annotations = annotations;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const annotations = target.annotations;
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, annotations.length);
      for (const annotation of annotations) {
        const sound = annotation.type === "sound";
        if (sound && !(annotation.data instanceof Uint8Array))
          throw new Error("Sound annotation data should be Uint8Array");
        if (!sound && typeof annotation.data !== "string")
          throw new Error("Text annotation data should be string");
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, sound ? "sndA" : "txtA");
        (0, psdWriter_1.writeUint8)(writer, annotation.open ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, 28);
        (0, psdWriter_1.writeUint16)(writer, 1);
        writeRect(writer, annotation.iconLocation);
        writeRect(writer, annotation.popupLocation);
        (0, psdWriter_1.writeColor)(writer, annotation.color);
        (0, psdWriter_1.writePascalString)(writer, annotation.author || "", 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.name || "", 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.date || "", 2);
        const contentOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeSignature)(writer, sound ? "sndM" : "txtC");
        (0, psdWriter_1.writeUint32)(writer, 0);
        const dataOffset = writer.offset;
        if (sound) {
          (0, psdWriter_1.writeBytes)(writer, annotation.data);
        } else {
          (0, psdWriter_1.writeUint16)(writer, 65279);
          const text = annotation.data.replace(/\n/g, "\r");
          for (let i = 0; i < text.length; i++)
            (0, psdWriter_1.writeUint16)(writer, text.charCodeAt(i));
        }
        writer.view.setUint32(lengthOffset, writer.offset - lengthOffset, false);
        writer.view.setUint32(contentOffset, writer.offset - contentOffset, false);
        writer.view.setUint32(dataOffset - 4, writer.offset - dataOffset, false);
      }
    });
    function readFileTypeSignature(reader) {
      const value = (0, psdReader_1.readSignature)(reader);
      return /^[\0 ]*$/.test(value) ? "" : value.trim();
    }
    function createLnkHandler(tag) {
      addHandler(tag, (target) => {
        const psd = target;
        if (!psd.linkedFiles || !psd.linkedFiles.length)
          return false;
        if (tag === "lnkE" && !psd.linkedFiles.some((f) => f.linkedFile))
          return false;
        return true;
      }, (reader, target, left, _psd) => {
        const psd = target;
        psd.linkedFiles = psd.linkedFiles || [];
        while (left() > 8) {
          let size = readLength64(reader);
          const startOffset = reader.offset;
          const type = (0, psdReader_1.readSignature)(reader);
          const version = (0, psdReader_1.readInt32)(reader);
          const id = (0, psdReader_1.readPascalString)(reader, 1);
          const name = (0, psdReader_1.readUnicodeString)(reader);
          const fileType = readFileTypeSignature(reader);
          const fileCreator = readFileTypeSignature(reader);
          const dataSize = readLength64(reader);
          const hasFileOpenDescriptor = (0, psdReader_1.readUint8)(reader);
          const fileOpenDescriptor = hasFileOpenDescriptor ? (0, descriptor_1.readVersionAndDescriptor)(reader) : void 0;
          const linkedFileDescriptor = type === "liFE" ? (0, descriptor_1.readVersionAndDescriptor)(reader) : void 0;
          const file = { id, name };
          if (fileType)
            file.type = fileType;
          if (fileCreator)
            file.creator = fileCreator;
          if (fileOpenDescriptor) {
            file.descriptor = {
              compInfo: {
                compID: fileOpenDescriptor.compInfo.compID,
                originalCompID: fileOpenDescriptor.compInfo.originalCompID
              }
            };
          }
          if (type === "liFE" && version > 3) {
            const year = (0, psdReader_1.readInt32)(reader);
            const month = (0, psdReader_1.readUint8)(reader);
            const day = (0, psdReader_1.readUint8)(reader);
            const hour = (0, psdReader_1.readUint8)(reader);
            const minute = (0, psdReader_1.readUint8)(reader);
            const seconds = (0, psdReader_1.readFloat64)(reader);
            const wholeSeconds = Math.floor(seconds);
            const ms = (seconds - wholeSeconds) * 1e3;
            try {
              file.time = new Date(Date.UTC(year, month, day, hour, minute, wholeSeconds, ms)).toISOString();
            } catch (_a) {
              file.time = (/* @__PURE__ */ new Date(0)).toISOString();
            }
          }
          const fileSize = type === "liFE" ? readLength64(reader) : 0;
          if (type === "liFD" && dataSize > left())
            throw new Error("Invalid linked file data size");
          if (type === "liFA")
            (0, psdReader_1.skipBytes)(reader, 8);
          if (type === "liFD")
            file.data = (0, psdReader_1.readBytes)(reader, dataSize);
          if (version >= 5)
            file.childDocumentID = (0, psdReader_1.readUnicodeString)(reader);
          if (version >= 6)
            file.assetModTime = (0, psdReader_1.readFloat64)(reader);
          if (version >= 7)
            file.assetLockedState = (0, psdReader_1.readUint8)(reader);
          if (type === "liFE" && version === 2) {
            if (fileSize > left())
              throw new Error("Invalid linked file size");
            file.data = (0, psdReader_1.readBytes)(reader, fileSize);
          }
          if (reader.skipLinkedFilesData)
            file.data = void 0;
          if (tag === "lnkE") {
            file.linkedFile = {
              fileSize,
              name: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor["Nm  "]) || "",
              fullPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.fullPath) || "",
              originalPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.originalPath) || "",
              relativePath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.relPath) || ""
            };
            if ((linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.alis) !== void 0)
              file.linkedFile.alias = linkedFileDescriptor.alis;
          }
          psd.linkedFiles.push(file);
          while (size % 4)
            size++;
          reader.offset = startOffset + size;
        }
        (0, psdReader_1.skipBytes)(reader, left());
      }, (writer, target) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const psd = target;
        for (const file of psd.linkedFiles) {
          if (tag === "lnkE" !== !!file.linkedFile)
            continue;
          const external = tag === "lnkE";
          let version = 2;
          if (file.assetLockedState != null)
            version = 7;
          else if (file.assetModTime != null)
            version = 6;
          else if (file.childDocumentID != null)
            version = 5;
          else if (external && !file.data)
            version = 4;
          (0, psdWriter_1.writeUint64)(writer, 0);
          const sizeOffset = writer.offset;
          (0, psdWriter_1.writeSignature)(writer, external ? "liFE" : file.data ? "liFD" : "liFA");
          (0, psdWriter_1.writeInt32)(writer, version);
          if (!file.id || typeof file.id !== "string" || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(file.id)) {
            throw new Error("Linked file ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)");
          }
          (0, psdWriter_1.writePascalString)(writer, file.id, 1);
          (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.name || "");
          (0, psdWriter_1.writeSignature)(writer, file.type ? `${file.type}    `.substring(0, 4) : "    ");
          (0, psdWriter_1.writeSignature)(writer, file.creator ? `${file.creator}    `.substring(0, 4) : "\0\0\0\0");
          (0, psdWriter_1.writeUint64)(writer, !external && file.data ? file.data.byteLength : 0);
          if (file.descriptor && file.descriptor.compInfo) {
            const desc = {
              compInfo: {
                compID: file.descriptor.compInfo.compID,
                originalCompID: file.descriptor.compInfo.originalCompID
              }
            };
            (0, psdWriter_1.writeUint8)(writer, 1);
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
          } else {
            (0, psdWriter_1.writeUint8)(writer, 0);
          }
          if (external) {
            const desc = Object.assign(Object.assign({ descVersion: 2, "Nm  ": (_b = (_a = file.linkedFile) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "", fullPath: (_d = (_c = file.linkedFile) === null || _c === void 0 ? void 0 : _c.fullPath) !== null && _d !== void 0 ? _d : "" }, ((_e = file.linkedFile) === null || _e === void 0 ? void 0 : _e.alias) !== void 0 ? { alis: file.linkedFile.alias } : {}), { originalPath: (_g = (_f = file.linkedFile) === null || _f === void 0 ? void 0 : _f.originalPath) !== null && _g !== void 0 ? _g : "", relPath: (_j = (_h = file.linkedFile) === null || _h === void 0 ? void 0 : _h.relativePath) !== null && _j !== void 0 ? _j : "" });
            (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "ExternalFileLink", desc);
          }
          if (external && version > 3) {
            const time = file.time ? new Date(file.time) : /* @__PURE__ */ new Date();
            (0, psdWriter_1.writeInt32)(writer, time.getUTCFullYear());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCMonth());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCDate());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCHours());
            (0, psdWriter_1.writeUint8)(writer, time.getUTCMinutes());
            (0, psdWriter_1.writeFloat64)(writer, time.getUTCSeconds() + time.getUTCMilliseconds() / 1e3);
          }
          if (external) {
            (0, psdWriter_1.writeUint64)(writer, (version === 2 ? (_k = file.data) === null || _k === void 0 ? void 0 : _k.byteLength : (_l = file.linkedFile) === null || _l === void 0 ? void 0 : _l.fileSize) || 0);
          } else if (file.data) {
            (0, psdWriter_1.writeBytes)(writer, file.data);
          } else {
            (0, psdWriter_1.writeZeros)(writer, 8);
          }
          if (version >= 5)
            (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.childDocumentID || "");
          if (version >= 6)
            (0, psdWriter_1.writeFloat64)(writer, file.assetModTime || 0);
          if (version >= 7)
            (0, psdWriter_1.writeUint8)(writer, file.assetLockedState || 0);
          if (external && version === 2 && file.data)
            (0, psdWriter_1.writeBytes)(writer, file.data);
          let size = writer.offset - sizeOffset;
          writer.view.setUint32(sizeOffset - 4, size, false);
          while (size % 4) {
            size++;
            (0, psdWriter_1.writeUint8)(writer, 0);
          }
        }
      });
    }
    createLnkHandler("lnk2");
    createLnkHandler("lnkE");
    addHandlerAlias("lnkD", "lnk2");
    addHandlerAlias("lnk3", "lnk2");
    addHandler("pths", (target) => {
      var _a;
      return ((_a = target.imageResources) === null || _a === void 0 ? void 0 : _a.savedPaths) !== void 0;
    }, (reader, _target, left, psd) => {
      var _a, _b;
      if (!left())
        return;
      if (reader.imageResourcesWhitelistSet && !reader.imageResourcesWhitelistSet.has("savedPaths")) {
        (0, psdReader_1.skipBytes)(reader, left());
        return;
      }
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
      const imageResources = (_a = psd.imageResources) !== null && _a !== void 0 ? _a : psd.imageResources = {};
      const savedPaths = (_b = imageResources.savedPaths) !== null && _b !== void 0 ? _b : imageResources.savedPaths = [];
      for (let i = 0; i < desc.pathList.length && i < savedPaths.length; i++) {
        const { pathUnicodeName, pathSymmetryClass } = desc.pathList[i];
        const path = savedPaths[i];
        if (imageResources.clippingPath && imageResources.clippingPath.name === path.name) {
          imageResources.clippingPath.name = pathUnicodeName;
        }
        path.name = pathUnicodeName;
        if (pathSymmetryClass)
          path.symmetryMode = pathSymmetryClass.pathSymmetryMode.split(".")[1];
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, _target, psd) => {
      const desc = {
        pathList: psd.imageResources.savedPaths.map((path) => Object.assign({ _name: "", _classID: "pathInfoClass", pathUnicodeName: path.name }, path.symmetryMode ? {
          pathSymmetryClass: {
            _name: "",
            _classID: "pathSymmetryClass",
            pathSymmetryMode: `pathSymmetryModeEnum.${path.symmetryMode}`
          }
        } : {}))
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "pathsDataClass", desc);
    });
    addHandler("lyvr", hasKey("version"), (reader, target) => target.version = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.version));
    addHandler(
      "lfxs",
      // effects of group layers (instead of 'lfx2' / 'lmfx')
      // effects of group layers (instead of 'lfx2' / 'lmfx')
      (target) => target.effects !== void 0 && isGroupLayer(target),
      (reader, target, left) => {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 0)
          throw new Error(`Invalid lfxs version`);
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        target.effects = (0, descriptor_1.parseEffects)(desc, reader);
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        const desc = (0, descriptor_1.serializeEffects)(target.effects, writer, true);
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      }
    );
    function adjustmentType(type) {
      return (target) => !!target.adjustment && target.adjustment.type === type;
    }
    addHandler("brit", adjustmentType("brightness/contrast"), (reader, target, left) => {
      if (!target.adjustment) {
        target.adjustment = {
          type: "brightness/contrast",
          brightness: (0, psdReader_1.readInt16)(reader),
          contrast: (0, psdReader_1.readInt16)(reader),
          meanValue: (0, psdReader_1.readInt16)(reader),
          labColorOnly: !!(0, psdReader_1.readUint8)(reader),
          useLegacy: true
        };
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a;
      const info = target.adjustment;
      (0, psdWriter_1.writeInt16)(writer, info.brightness || 0);
      (0, psdWriter_1.writeInt16)(writer, info.contrast || 0);
      (0, psdWriter_1.writeInt16)(writer, (_a = info.meanValue) !== null && _a !== void 0 ? _a : 127);
      (0, psdWriter_1.writeUint8)(writer, info.labColorOnly ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    function readLevelsChannel(reader) {
      const shadowInput = (0, psdReader_1.readInt16)(reader);
      const highlightInput = (0, psdReader_1.readInt16)(reader);
      const shadowOutput = (0, psdReader_1.readInt16)(reader);
      const highlightOutput = (0, psdReader_1.readInt16)(reader);
      const midtoneInput = (0, psdReader_1.readInt16)(reader) / 100;
      return { shadowInput, highlightInput, shadowOutput, highlightOutput, midtoneInput };
    }
    var defaultLevelsChannel = { shadowInput: 0, highlightInput: 255, shadowOutput: 0, highlightOutput: 255, midtoneInput: 1 };
    function isDefaultLevelsChannel(c) {
      return c.shadowInput === 0 && c.highlightInput === 255 && c.shadowOutput === 0 && c.highlightOutput === 255 && c.midtoneInput === 1;
    }
    function writeLevelsChannel(writer, channel) {
      (0, psdWriter_1.writeInt16)(writer, channel.shadowInput);
      (0, psdWriter_1.writeInt16)(writer, channel.highlightInput);
      (0, psdWriter_1.writeInt16)(writer, channel.shadowOutput);
      (0, psdWriter_1.writeInt16)(writer, channel.highlightOutput);
      (0, psdWriter_1.writeInt16)(writer, Math.round(channel.midtoneInput * 100));
    }
    addHandler("levl", adjustmentType("levels"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error("Invalid levl version");
      const channels = [];
      for (let i = 0; i < 29 && left() >= 10; i++) {
        channels.push(readLevelsChannel(reader));
      }
      if (left() >= 8) {
        const signature = (0, psdReader_1.readSignature)(reader);
        let totalChannelRecords;
        if (signature === "ls\0") {
          totalChannelRecords = (0, psdReader_1.readUint16)(reader);
        } else {
          if (signature !== "Lvls")
            throw new Error(`Invalid levl signature`);
          if ((0, psdReader_1.readUint16)(reader) !== 3)
            throw new Error(`Invalid levl version`);
          totalChannelRecords = (0, psdReader_1.readUint16)(reader);
        }
        while (channels.length < totalChannelRecords && left() >= 10) {
          channels.push(readLevelsChannel(reader));
        }
      }
      while (channels.length && isDefaultLevelsChannel(channels[channels.length - 1]))
        channels.pop();
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "levels", channels });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const channels = target.adjustment.channels || [];
      (0, psdWriter_1.writeUint16)(writer, 2);
      for (let i = 0; i < 29; i++) {
        writeLevelsChannel(writer, channels[i] || defaultLevelsChannel);
      }
      (0, psdWriter_1.writeSignature)(writer, "Lvls");
      (0, psdWriter_1.writeUint16)(writer, 3);
      (0, psdWriter_1.writeUint16)(writer, 62);
      for (let i = 29; i < 62; i++) {
        writeLevelsChannel(writer, channels[i] || defaultLevelsChannel);
      }
    });
    function readCurveChannel(reader) {
      const nodes = (0, psdReader_1.readUint16)(reader);
      const channel = [];
      for (let j = 0; j < nodes; j++) {
        const output = (0, psdReader_1.readInt16)(reader);
        const input = (0, psdReader_1.readInt16)(reader);
        channel.push({ input, output });
      }
      return channel;
    }
    function writeCurveChannel(writer, channel) {
      (0, psdWriter_1.writeUint16)(writer, channel.length);
      for (const n of channel) {
        (0, psdWriter_1.writeUint16)(writer, n.output);
        (0, psdWriter_1.writeUint16)(writer, n.input);
      }
    }
    addHandler("curv", adjustmentType("curves"), (reader, target, left) => {
      const isMap = !!(0, psdReader_1.readUint8)(reader);
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 1 && version !== 4)
        throw new Error("Invalid curv version");
      const countOrMask = (0, psdReader_1.readUint32)(reader);
      const channels = [];
      const readChannel = () => isMap ? Array.from((0, psdReader_1.readBytes)(reader, 256)) : readCurveChannel(reader);
      if (version === 1) {
        for (let i = 0; i < 32; i++) {
          if (countOrMask & 1 << i) {
            while (channels.length < i)
              channels.push([]);
            channels.push(readChannel());
          }
        }
      } else {
        if (countOrMask > 64)
          throw new Error("Invalid curv channel count");
        for (let i = 0; i < countOrMask; i++)
          channels.push(readChannel());
      }
      if (version === 1 && left() >= 10 && (0, psdReader_1.readSignature)(reader) === "Crv ") {
        (0, psdReader_1.readUint16)(reader);
        const count = (0, psdReader_1.readUint32)(reader);
        for (let i = 0; i < count && left() >= 2; i++) {
          const index = (0, psdReader_1.readUint16)(reader);
          const channel = readChannel();
          while (channels.length < index)
            channels.push([]);
          channels[index] = channel;
        }
      }
      target.adjustment = Object.assign(Object.assign(Object.assign({}, target.adjustment), { type: "curves" }), isMap ? { values: channels } : { channels });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a;
      const adjustment = target.adjustment;
      const isMap = !!adjustment.values;
      const channels = (isMap ? adjustment.values : adjustment.channels) || [];
      const used = [];
      let channelsMask = 0;
      for (let i = 0; i < channels.length; i++) {
        if ((_a = channels[i]) === null || _a === void 0 ? void 0 : _a.length) {
          if (i < 32)
            channelsMask |= 1 << i;
          used.push(i);
        }
      }
      const writeChannel = (channel) => {
        var _a2;
        if (isMap) {
          for (let i = 0; i < 256; i++)
            (0, psdWriter_1.writeUint8)(writer, (0, helpers_1.clamp)(Math.round((_a2 = channel[i]) !== null && _a2 !== void 0 ? _a2 : i), 0, 255));
        } else {
          writeCurveChannel(writer, channel);
        }
      };
      (0, psdWriter_1.writeUint8)(writer, isMap ? 1 : 0);
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint32)(writer, channelsMask >>> 0);
      for (const i of used)
        if (i < 32)
          writeChannel(channels[i]);
      (0, psdWriter_1.writeSignature)(writer, "Crv ");
      (0, psdWriter_1.writeUint16)(writer, 4);
      (0, psdWriter_1.writeUint32)(writer, used.length);
      for (const i of used) {
        (0, psdWriter_1.writeUint16)(writer, i);
        writeChannel(channels[i]);
      }
    });
    addHandler("expA", adjustmentType("exposure"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid expA version");
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "exposure", exposure: (0, psdReader_1.readFloat32)(reader), offset: (0, psdReader_1.readFloat32)(reader), gamma: (0, psdReader_1.readFloat32)(reader) });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeFloat32)(writer, info.exposure);
      (0, psdWriter_1.writeFloat32)(writer, info.offset);
      (0, psdWriter_1.writeFloat32)(writer, info.gamma);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    addHandler("vibA", adjustmentType("vibrance"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = { type: "vibrance" };
      if (desc.vibrance !== void 0)
        target.adjustment.vibrance = desc.vibrance;
      if (desc.Strt !== void 0)
        target.adjustment.saturation = desc.Strt;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {};
      if (info.vibrance !== void 0)
        desc.vibrance = info.vibrance;
      if (info.saturation !== void 0)
        desc.Strt = info.saturation;
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    function readHueChannel(reader) {
      return {
        a: (0, psdReader_1.readInt16)(reader),
        b: (0, psdReader_1.readInt16)(reader),
        c: (0, psdReader_1.readInt16)(reader),
        d: (0, psdReader_1.readInt16)(reader),
        hue: (0, psdReader_1.readInt16)(reader),
        saturation: (0, psdReader_1.readInt16)(reader),
        lightness: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeHueChannel(writer, channel) {
      const c = channel || {};
      (0, psdWriter_1.writeInt16)(writer, c.a || 0);
      (0, psdWriter_1.writeInt16)(writer, c.b || 0);
      (0, psdWriter_1.writeInt16)(writer, c.c || 0);
      (0, psdWriter_1.writeInt16)(writer, c.d || 0);
      (0, psdWriter_1.writeInt16)(writer, c.hue || 0);
      (0, psdWriter_1.writeInt16)(writer, c.saturation || 0);
      (0, psdWriter_1.writeInt16)(writer, c.lightness || 0);
    }
    addHandler("hue2", adjustmentType("hue/saturation"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error("Invalid hue2 version");
      const colorize = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 1);
      const colorizeHue = (0, psdReader_1.readInt16)(reader);
      const colorizeSaturation = (0, psdReader_1.readInt16)(reader);
      const colorizeLightness = (0, psdReader_1.readInt16)(reader);
      target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "hue/saturation", colorize, colorization: {
        hue: colorizeHue < 0 ? colorizeHue + 360 : colorizeHue,
        saturation: colorizeSaturation,
        lightness: colorizeLightness
      }, master: {
        hue: (0, psdReader_1.readInt16)(reader),
        saturation: (0, psdReader_1.readInt16)(reader),
        lightness: (0, psdReader_1.readInt16)(reader)
      }, reds: readHueChannel(reader), yellows: readHueChannel(reader), greens: readHueChannel(reader), cyans: readHueChannel(reader), blues: readHueChannel(reader), magentas: readHueChannel(reader) });
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeUint8)(writer, info.colorize ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, 0);
      const colorizeHue = Math.round((_b = (_a = info.colorization) === null || _a === void 0 ? void 0 : _a.hue) !== null && _b !== void 0 ? _b : 0);
      (0, psdWriter_1.writeInt16)(writer, colorizeHue > 180 ? colorizeHue - 360 : colorizeHue);
      (0, psdWriter_1.writeInt16)(writer, Math.round((_d = (_c = info.colorization) === null || _c === void 0 ? void 0 : _c.saturation) !== null && _d !== void 0 ? _d : 0));
      (0, psdWriter_1.writeInt16)(writer, Math.round((_f = (_e = info.colorization) === null || _e === void 0 ? void 0 : _e.lightness) !== null && _f !== void 0 ? _f : 0));
      (0, psdWriter_1.writeInt16)(writer, Math.round((_h = (_g = info.master) === null || _g === void 0 ? void 0 : _g.hue) !== null && _h !== void 0 ? _h : 0));
      (0, psdWriter_1.writeInt16)(writer, Math.round((_k = (_j = info.master) === null || _j === void 0 ? void 0 : _j.saturation) !== null && _k !== void 0 ? _k : 0));
      (0, psdWriter_1.writeInt16)(writer, Math.round((_m = (_l = info.master) === null || _l === void 0 ? void 0 : _l.lightness) !== null && _m !== void 0 ? _m : 0));
      writeHueChannel(writer, info.reds);
      writeHueChannel(writer, info.yellows);
      writeHueChannel(writer, info.greens);
      writeHueChannel(writer, info.cyans);
      writeHueChannel(writer, info.blues);
      writeHueChannel(writer, info.magentas);
    });
    function readColorBalance(reader) {
      return {
        cyanRed: (0, psdReader_1.readInt16)(reader),
        magentaGreen: (0, psdReader_1.readInt16)(reader),
        yellowBlue: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeColorBalance(writer, value) {
      (0, psdWriter_1.writeInt16)(writer, value.cyanRed || 0);
      (0, psdWriter_1.writeInt16)(writer, value.magentaGreen || 0);
      (0, psdWriter_1.writeInt16)(writer, value.yellowBlue || 0);
    }
    addHandler("blnc", adjustmentType("color balance"), (reader, target, left) => {
      target.adjustment = {
        type: "color balance",
        shadows: readColorBalance(reader),
        midtones: readColorBalance(reader),
        highlights: readColorBalance(reader),
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      writeColorBalance(writer, info.shadows || {});
      writeColorBalance(writer, info.midtones || {});
      writeColorBalance(writer, info.highlights || {});
      (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 1);
    });
    addHandler("blwh", adjustmentType("black & white"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = {
        type: "black & white",
        reds: desc["Rd  "],
        yellows: desc.Yllw,
        greens: desc["Grn "],
        cyans: desc["Cyn "],
        blues: desc["Bl  "],
        magentas: desc.Mgnt,
        useTint: !!desc.useTint,
        presetKind: desc.bwPresetKind,
        presetFileName: desc.blackAndWhitePresetFileName
      };
      if (desc.tintColor !== void 0)
        target.adjustment.tintColor = (0, descriptor_1.parseColor)(desc.tintColor);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {
        "Rd  ": info.reds || 0,
        Yllw: info.yellows || 0,
        "Grn ": info.greens || 0,
        "Cyn ": info.cyans || 0,
        "Bl  ": info.blues || 0,
        Mgnt: info.magentas || 0,
        useTint: !!info.useTint,
        tintColor: (0, descriptor_1.serializeColor)(info.tintColor),
        bwPresetKind: info.presetKind || 0,
        blackAndWhitePresetFileName: info.presetFileName || ""
      };
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("phfl", adjustmentType("photo filter"), (reader, target, left) => {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 2 && version !== 3)
        throw new Error("Invalid phfl version");
      let color;
      if (version === 2) {
        color = (0, psdReader_1.readColor)(reader);
      } else {
        const x = (0, psdReader_1.readInt32)(reader) / 32768;
        const y = (0, psdReader_1.readInt32)(reader) / 32768;
        const z = (0, psdReader_1.readInt32)(reader) / 32768;
        if (!(x >= 0 && y >= 0 && z >= 0 && x <= 2 && y <= 2 && z <= 2))
          throw new Error("Invalid phfl XYZ color");
        const f = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
        color = {
          l: Math.max(0, 116 * f(y) - 16) / 100,
          a: (0, helpers_1.normalizeLabAB)(500 * (f(x) - f(y))),
          b: (0, helpers_1.normalizeLabAB)(200 * (f(y) - f(z)))
        };
      }
      target.adjustment = {
        type: "photo filter",
        color,
        density: (0, psdReader_1.readUint32)(reader) / 100,
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeColor)(writer, info.color || { l: 0, a: 0, b: 0 });
      (0, psdWriter_1.writeUint32)(writer, Math.round(Math.max(0, info.density || 0) * 100));
      (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    function readMixrChannel(reader) {
      const red = (0, psdReader_1.readInt16)(reader);
      const green = (0, psdReader_1.readInt16)(reader);
      const blue = (0, psdReader_1.readInt16)(reader);
      (0, psdReader_1.skipBytes)(reader, 2);
      const constant = (0, psdReader_1.readInt16)(reader);
      return { red, green, blue, constant };
    }
    function writeMixrChannel(writer, channel) {
      const c = channel || {};
      (0, psdWriter_1.writeInt16)(writer, c.red);
      (0, psdWriter_1.writeInt16)(writer, c.green);
      (0, psdWriter_1.writeInt16)(writer, c.blue);
      (0, psdWriter_1.writeZeros)(writer, 2);
      (0, psdWriter_1.writeInt16)(writer, c.constant);
    }
    addHandler("mixr", adjustmentType("channel mixer"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid mixr version");
      const adjustment = target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: "channel mixer", monochrome: !!(0, psdReader_1.readUint16)(reader) });
      if (!adjustment.monochrome) {
        adjustment.red = readMixrChannel(reader);
        adjustment.green = readMixrChannel(reader);
        adjustment.blue = readMixrChannel(reader);
      }
      adjustment.gray = readMixrChannel(reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint16)(writer, info.monochrome ? 1 : 0);
      if (info.monochrome) {
        writeMixrChannel(writer, info.gray);
        (0, psdWriter_1.writeZeros)(writer, 3 * 5 * 2);
      } else {
        writeMixrChannel(writer, info.red);
        writeMixrChannel(writer, info.green);
        writeMixrChannel(writer, info.blue);
        writeMixrChannel(writer, info.gray);
      }
    });
    var colorLookupType = (0, helpers_1.createEnum)("colorLookupType", "3dlut", {
      "3dlut": "3DLUT",
      abstractProfile: "abstractProfile",
      deviceLinkProfile: "deviceLinkProfile"
    });
    var LUTFormatType = (0, helpers_1.createEnum)("LUTFormatType", "look", {
      look: "LUTFormatLOOK",
      cube: "LUTFormatCUBE",
      "3dl": "LUTFormat3DL"
    });
    var colorLookupOrder = (0, helpers_1.createEnum)("colorLookupOrder", "rgb", {
      rgb: "rgbOrder",
      bgr: "bgrOrder"
    });
    addHandler("clrL", adjustmentType("color lookup"), (reader, target, left) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid clrL version");
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.adjustment = { type: "color lookup" };
      const info = target.adjustment;
      if (desc.lookupType !== void 0)
        info.lookupType = colorLookupType.decode(desc.lookupType);
      if (desc["Nm  "] !== void 0)
        info.name = desc["Nm  "];
      if (desc.Dthr !== void 0)
        info.dither = desc.Dthr;
      if (desc.profile !== void 0)
        info.profile = desc.profile;
      if (desc.LUTFormat !== void 0)
        info.lutFormat = LUTFormatType.decode(desc.LUTFormat);
      if (desc.dataOrder !== void 0)
        info.dataOrder = colorLookupOrder.decode(desc.dataOrder);
      if (desc.tableOrder !== void 0)
        info.tableOrder = colorLookupOrder.decode(desc.tableOrder);
      if (desc.LUT3DFileData !== void 0)
        info.lut3DFileData = desc.LUT3DFileData;
      if (desc.LUT3DFileName !== void 0)
        info.lut3DFileName = desc.LUT3DFileName;
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const info = target.adjustment;
      const desc = {};
      if (info.lookupType !== void 0)
        desc.lookupType = colorLookupType.encode(info.lookupType);
      if (info.name !== void 0)
        desc["Nm  "] = info.name;
      if (info.dither !== void 0)
        desc.Dthr = info.dither;
      if (info.profile !== void 0)
        desc.profile = info.profile;
      if (info.lutFormat !== void 0)
        desc.LUTFormat = LUTFormatType.encode(info.lutFormat);
      if (info.dataOrder !== void 0)
        desc.dataOrder = colorLookupOrder.encode(info.dataOrder);
      if (info.tableOrder !== void 0)
        desc.tableOrder = colorLookupOrder.encode(info.tableOrder);
      if (info.lut3DFileData !== void 0)
        desc.LUT3DFileData = info.lut3DFileData;
      if (info.lut3DFileName !== void 0)
        desc.LUT3DFileName = info.lut3DFileName;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("nvrt", adjustmentType("invert"), (reader, target, left) => {
      target.adjustment = { type: "invert" };
      (0, psdReader_1.skipBytes)(reader, left());
    }, () => {
    });
    addHandler("post", adjustmentType("posterize"), (reader, target, left) => {
      target.adjustment = {
        type: "posterize",
        levels: (0, psdReader_1.readUint16)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, (_a = info.levels) !== null && _a !== void 0 ? _a : 4);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    addHandler("thrs", adjustmentType("threshold"), (reader, target, left) => {
      target.adjustment = {
        type: "threshold",
        level: (0, psdReader_1.readUint16)(reader)
      };
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, (_a = info.level) !== null && _a !== void 0 ? _a : 128);
      (0, psdWriter_1.writeZeros)(writer, 2);
    });
    var grdmColorModels = ["", "", "", "rgb", "hsb", "", "lab"];
    addHandler("grdm", adjustmentType("gradient map"), (reader, target, left) => {
      const version = (0, psdReader_1.readUint16)(reader);
      if (version !== 1 && version !== 3)
        throw new Error("Invalid grdm version");
      const info = {
        type: "gradient map",
        gradientType: "solid"
      };
      info.reverse = !!(0, psdReader_1.readUint8)(reader);
      info.dither = !!(0, psdReader_1.readUint8)(reader);
      const hasMethod = !!(0, psdReader_1.readUint8)(reader);
      reader.offset--;
      if (hasMethod) {
        const method = (0, psdReader_1.readSignature)(reader);
        info.method = descriptor_1.gradientInterpolationMethodType.decode(`gradientInterpolationMethodType.${method}`);
      }
      info.name = (0, psdReader_1.readUnicodeString)(reader);
      info.colorStops = [];
      info.opacityStops = [];
      const stopsCount = (0, psdReader_1.readUint16)(reader);
      for (let i = 0; i < stopsCount; i++) {
        info.colorStops.push({
          location: (0, psdReader_1.readUint32)(reader),
          midpoint: (0, psdReader_1.readUint32)(reader) / 100,
          color: (0, psdReader_1.readColor)(reader)
        });
        (0, psdReader_1.skipBytes)(reader, 2);
      }
      const opacityStopsCount = (0, psdReader_1.readUint16)(reader);
      for (let i = 0; i < opacityStopsCount; i++) {
        info.opacityStops.push({
          location: (0, psdReader_1.readUint32)(reader),
          midpoint: (0, psdReader_1.readUint32)(reader) / 100,
          opacity: (0, psdReader_1.readUint16)(reader) / 255
        });
      }
      const expansionCount = (0, psdReader_1.readUint16)(reader);
      if (expansionCount !== 2)
        throw new Error("Invalid grdm expansion count");
      const interpolation = (0, psdReader_1.readUint16)(reader);
      info.smoothness = interpolation / 4096;
      const length = (0, psdReader_1.readUint16)(reader);
      if (length !== 32)
        throw new Error("Invalid grdm length");
      info.gradientType = (0, psdReader_1.readUint16)(reader) ? "noise" : "solid";
      info.randomSeed = (0, psdReader_1.readUint32)(reader);
      info.addTransparency = !!(0, psdReader_1.readUint16)(reader);
      info.restrictColors = !!(0, psdReader_1.readUint16)(reader);
      info.roughness = (0, psdReader_1.readUint32)(reader) / 4096;
      info.colorModel = grdmColorModels[(0, psdReader_1.readUint16)(reader)] || "rgb";
      info.min = [
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768
      ];
      info.max = [
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768,
        (0, psdReader_1.readUint16)(reader) / 32768
      ];
      (0, psdReader_1.skipBytes)(reader, left());
      for (const s of info.colorStops)
        s.location /= 4096;
      for (const s of info.opacityStops)
        s.location /= 4096;
      target.adjustment = info;
    }, (writer, target) => {
      var _a, _b, _c;
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, info.method !== void 0 ? 3 : 1);
      (0, psdWriter_1.writeUint8)(writer, info.reverse ? 1 : 0);
      (0, psdWriter_1.writeUint8)(writer, info.dither ? 1 : 0);
      if (info.method !== void 0) {
        (0, psdWriter_1.writeSignature)(writer, descriptor_1.gradientInterpolationMethodType.encode(info.method).split(".")[1]);
      }
      (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, info.name || "");
      (0, psdWriter_1.writeUint16)(writer, info.colorStops && info.colorStops.length || 0);
      const interpolation = Math.round((0, helpers_1.clamp)((_a = info.smoothness) !== null && _a !== void 0 ? _a : 1, 0, 1) * 4096);
      for (const s of info.colorStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round((0, helpers_1.clamp)(s.location, 0, 1) * 4096));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeColor)(writer, s.color);
        (0, psdWriter_1.writeZeros)(writer, 2);
      }
      (0, psdWriter_1.writeUint16)(writer, info.opacityStops && info.opacityStops.length || 0);
      for (const s of info.opacityStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round((0, helpers_1.clamp)(s.location, 0, 1) * 4096));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeUint16)(writer, Math.round((0, helpers_1.clamp)(s.opacity, 0, 1) * 255));
      }
      (0, psdWriter_1.writeUint16)(writer, 2);
      (0, psdWriter_1.writeUint16)(writer, interpolation);
      (0, psdWriter_1.writeUint16)(writer, 32);
      (0, psdWriter_1.writeUint16)(writer, info.gradientType === "noise" ? 1 : 0);
      (0, psdWriter_1.writeUint32)(writer, info.randomSeed || 0);
      (0, psdWriter_1.writeUint16)(writer, info.addTransparency ? 1 : 0);
      (0, psdWriter_1.writeUint16)(writer, info.restrictColors ? 1 : 0);
      (0, psdWriter_1.writeUint32)(writer, Math.round(((_b = info.roughness) !== null && _b !== void 0 ? _b : 1) * 4096));
      const colorModel = grdmColorModels.indexOf((_c = info.colorModel) !== null && _c !== void 0 ? _c : "rgb");
      (0, psdWriter_1.writeUint16)(writer, colorModel === -1 ? 3 : colorModel);
      for (let i = 0; i < 4; i++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.min && info.min[i] || 0) * 32768));
      for (let i = 0; i < 4; i++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.max && info.max[i] || 0) * 32768));
      (0, psdWriter_1.writeZeros)(writer, 4);
    });
    function readSelectiveColors(reader) {
      return {
        c: (0, psdReader_1.readInt16)(reader),
        m: (0, psdReader_1.readInt16)(reader),
        y: (0, psdReader_1.readInt16)(reader),
        k: (0, psdReader_1.readInt16)(reader)
      };
    }
    function writeSelectiveColors(writer, cmyk) {
      const c = cmyk || {};
      (0, psdWriter_1.writeInt16)(writer, c.c);
      (0, psdWriter_1.writeInt16)(writer, c.m);
      (0, psdWriter_1.writeInt16)(writer, c.y);
      (0, psdWriter_1.writeInt16)(writer, c.k);
    }
    addHandler("selc", adjustmentType("selective color"), (reader, target) => {
      if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error("Invalid selc version");
      const mode = (0, psdReader_1.readUint16)(reader) ? "absolute" : "relative";
      (0, psdReader_1.skipBytes)(reader, 8);
      target.adjustment = {
        type: "selective color",
        mode,
        reds: readSelectiveColors(reader),
        yellows: readSelectiveColors(reader),
        greens: readSelectiveColors(reader),
        cyans: readSelectiveColors(reader),
        blues: readSelectiveColors(reader),
        magentas: readSelectiveColors(reader),
        whites: readSelectiveColors(reader),
        neutrals: readSelectiveColors(reader),
        blacks: readSelectiveColors(reader)
      };
    }, (writer, target) => {
      const info = target.adjustment;
      (0, psdWriter_1.writeUint16)(writer, 1);
      (0, psdWriter_1.writeUint16)(writer, info.mode === "absolute" ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 8);
      writeSelectiveColors(writer, info.reds);
      writeSelectiveColors(writer, info.yellows);
      writeSelectiveColors(writer, info.greens);
      writeSelectiveColors(writer, info.cyans);
      writeSelectiveColors(writer, info.blues);
      writeSelectiveColors(writer, info.magentas);
      writeSelectiveColors(writer, info.whites);
      writeSelectiveColors(writer, info.neutrals);
      writeSelectiveColors(writer, info.blacks);
    });
    addHandler("CgEd", (target) => {
      const a = target.adjustment;
      if (!a)
        return false;
      return a.type === "brightness/contrast" && !a.useLegacy || (a.type === "levels" || a.type === "curves" || a.type === "exposure" || a.type === "channel mixer" || a.type === "hue/saturation") && a.presetFileName !== void 0;
    }, (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if (desc.Vrsn !== 1)
        throw new Error("Invalid CgEd version");
      if ("presetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.presetKind, presetFileName: desc.presetFileName });
      } else if ("curvesPresetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.curvesPresetKind, presetFileName: desc.curvesPresetFileName });
      } else if ("mixerPresetFileName" in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.mixerPresetKind, presetFileName: desc.mixerPresetFileName });
      } else {
        target.adjustment = {
          type: "brightness/contrast",
          brightness: desc.Brgh,
          contrast: desc.Cntr,
          meanValue: desc.means,
          useLegacy: !!desc.useLegacy,
          labColorOnly: !!desc["Lab "],
          auto: !!desc.Auto
        };
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      var _a, _b, _c, _d;
      const info = target.adjustment;
      if (info.type === "levels" || info.type === "exposure" || info.type === "hue/saturation") {
        const desc = {
          Vrsn: 1,
          presetKind: (_a = info.presetKind) !== null && _a !== void 0 ? _a : 1,
          presetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "curves") {
        const desc = {
          Vrsn: 1,
          curvesPresetKind: (_b = info.presetKind) !== null && _b !== void 0 ? _b : 1,
          curvesPresetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "channel mixer") {
        const desc = {
          Vrsn: 1,
          mixerPresetKind: (_c = info.presetKind) !== null && _c !== void 0 ? _c : 1,
          mixerPresetFileName: info.presetFileName || ""
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else if (info.type === "brightness/contrast") {
        const desc = {
          Vrsn: 1,
          Brgh: info.brightness || 0,
          Cntr: info.contrast || 0,
          means: (_d = info.meanValue) !== null && _d !== void 0 ? _d : 127,
          "Lab ": !!info.labColorOnly,
          useLegacy: !!info.useLegacy,
          Auto: !!info.auto
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
      } else {
        throw new Error("Unhandled CgEd case");
      }
    });
    function getTextLayersSortedByIndex(psd) {
      const layers = [];
      function collect(layer) {
        var _a;
        if (layer.children) {
          for (const child of layer.children) {
            if (((_a = child.text) === null || _a === void 0 ? void 0 : _a.index) !== void 0) {
              layers[child.text.index] = child;
            }
            collect(child);
          }
        }
      }
      collect(psd);
      return layers;
    }
    addHandler("Txt2", hasKey("engineData"), (reader, target, left, psd) => {
      const data = (0, psdReader_1.readBytes)(reader, left());
      target.engineData = (0, base64_js_1.fromByteArray)(data);
      const layersByIndex = getTextLayersSortedByIndex(psd);
      const engineData = (0, engineData_1.parseEngineData)(data, reader);
      const engineData2 = (0, engineData2_1.decodeEngineData2)(engineData);
      const TextFrameSet = engineData2.ResourceDict.TextFrameSet;
      if (TextFrameSet) {
        for (let i = 0; i < TextFrameSet.length; i++) {
          const layer = layersByIndex[i];
          if (TextFrameSet[i].path && (layer === null || layer === void 0 ? void 0 : layer.text)) {
            layer.text.textPath = TextFrameSet[i].path;
          }
        }
      }
    }, (writer, target) => {
      const buffer = (0, base64_js_1.toByteArray)(target.engineData);
      (0, psdWriter_1.writeBytes)(writer, buffer);
    });
    addHandler("FEid", hasKey("filterEffectsMasks"), (reader, target, leftBytes, psd) => {
      const version = (0, psdReader_1.readInt32)(reader);
      if (version < 1 || version > 3)
        throw new Error(`Invalid filterEffects version ${version}`);
      target.filterEffectsMasks = [];
      while (leftBytes() > 8) {
        if ((0, psdReader_1.readUint32)(reader))
          throw new Error("filterEffects: 64 bit length is not supported");
        const length = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + length;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const effectVersion = (0, psdReader_1.readInt32)(reader);
        if (effectVersion !== 1)
          throw new Error(`Invalid filterEffect version ${effectVersion}`);
        if ((0, psdReader_1.readUint32)(reader))
          throw new Error("filterEffect: 64 bit length is not supported");
        (0, psdReader_1.readUint32)(reader);
        const top = (0, psdReader_1.readInt32)(reader);
        const left = (0, psdReader_1.readInt32)(reader);
        const bottom = (0, psdReader_1.readInt32)(reader);
        const right = (0, psdReader_1.readInt32)(reader);
        const depth = (0, psdReader_1.readInt32)(reader);
        const maxChannels = (0, psdReader_1.readInt32)(reader);
        const channels = [];
        for (let i = 0; i < maxChannels + 2; i++) {
          const exists = (0, psdReader_1.readInt32)(reader);
          if (exists) {
            if ((0, psdReader_1.readUint32)(reader))
              throw new Error("filterEffect: 64 bit length is not supported");
            const channelLength = (0, psdReader_1.readUint32)(reader);
            if (!channelLength)
              throw new Error("filterEffect: Empty channel");
            const compressionMode = (0, psdReader_1.readUint16)(reader);
            if (channelLength - 2 > leftBytes())
              throw new Error("filterEffect: Invalid channel length");
            const data = (0, psdReader_1.readBytes)(reader, channelLength - 2);
            channels.push({ compressionMode, data });
          } else {
            channels.push(void 0);
          }
        }
        target.filterEffectsMasks.push({ id, top, left, bottom, right, depth, colorMode: psd.colorMode, channels });
        if (reader.offset < end && (0, psdReader_1.readUint8)(reader)) {
          const top2 = (0, psdReader_1.readInt32)(reader);
          const left2 = (0, psdReader_1.readInt32)(reader);
          const bottom2 = (0, psdReader_1.readInt32)(reader);
          const right2 = (0, psdReader_1.readInt32)(reader);
          if ((0, psdReader_1.readUint32)(reader))
            throw new Error("filterEffect: 64 bit length is not supported");
          const extraLength = (0, psdReader_1.readUint32)(reader);
          const compressionMode = (0, psdReader_1.readUint16)(reader);
          if (extraLength - 2 > leftBytes())
            throw new Error("filterEffect: Invalid extra channel length");
          const data = (0, psdReader_1.readBytes)(reader, extraLength - 2);
          target.filterEffectsMasks[target.filterEffectsMasks.length - 1].extra = { top: top2, left: left2, bottom: bottom2, right: right2, compressionMode, data };
        }
        reader.offset = end;
        let len = length;
        while (len % 4) {
          reader.offset++;
          len++;
        }
      }
    }, (writer, target) => {
      (0, psdWriter_1.writeInt32)(writer, 3);
      for (const mask of target.filterEffectsMasks) {
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writePascalString)(writer, mask.id, 1);
        (0, psdWriter_1.writeInt32)(writer, 1);
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const length2Offset = writer.offset;
        (0, psdWriter_1.writeInt32)(writer, mask.top);
        (0, psdWriter_1.writeInt32)(writer, mask.left);
        (0, psdWriter_1.writeInt32)(writer, mask.bottom);
        (0, psdWriter_1.writeInt32)(writer, mask.right);
        (0, psdWriter_1.writeInt32)(writer, mask.depth);
        const maxChannels = Math.max(0, mask.channels.length - 2);
        (0, psdWriter_1.writeInt32)(writer, maxChannels);
        for (let i = 0; i < maxChannels + 2; i++) {
          const channel = mask.channels[i];
          (0, psdWriter_1.writeInt32)(writer, channel ? 1 : 0);
          if (channel) {
            (0, psdWriter_1.writeUint32)(writer, 0);
            (0, psdWriter_1.writeUint32)(writer, channel.data.length + 2);
            (0, psdWriter_1.writeUint16)(writer, channel.compressionMode);
            (0, psdWriter_1.writeBytes)(writer, channel.data);
          }
        }
        writer.view.setUint32(length2Offset - 4, writer.offset - length2Offset, false);
        const extra = mask.extra;
        if (extra) {
          (0, psdWriter_1.writeUint8)(writer, 1);
          (0, psdWriter_1.writeInt32)(writer, extra.top);
          (0, psdWriter_1.writeInt32)(writer, extra.left);
          (0, psdWriter_1.writeInt32)(writer, extra.bottom);
          (0, psdWriter_1.writeInt32)(writer, extra.right);
          (0, psdWriter_1.writeUint32)(writer, 0);
          (0, psdWriter_1.writeUint32)(writer, extra.data.byteLength + 2);
          (0, psdWriter_1.writeUint16)(writer, extra.compressionMode);
          (0, psdWriter_1.writeBytes)(writer, extra.data);
        }
        let length = writer.offset - lengthOffset;
        writer.view.setUint32(lengthOffset - 4, length, false);
        while (length % 4) {
          (0, psdWriter_1.writeZeros)(writer, 1);
          length++;
        }
      }
    });
    addHandlerAlias("FXid", "FEid");
    addHandlerAlias("FELS", "FEid");
    addHandlerAlias("hue ", "hue2");
    addHandlerAlias("plLd", "PlLd");
    addHandlerAlias("abdd", "artb");
    addHandler("FMsk", hasKey("filterMask"), (reader, target) => {
      target.filterMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 100
      };
    }, (writer, target) => {
      var _a;
      (0, psdWriter_1.writeColor)(writer, target.filterMask.colorSpace);
      (0, psdWriter_1.writeUint16)(writer, Math.round((0, helpers_1.clamp)((_a = target.filterMask.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 100));
    });
    addHandler(
      "artd",
      // document-wide artboard info
      // document-wide artboard info
      (target) => target.artboards !== void 0,
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        const artboards = target.artboards = { count: desc["Cnt "] };
        if (desc.autoExpandOffset)
          artboards.autoExpandOffset = { horizontal: desc.autoExpandOffset.Hrzn, vertical: desc.autoExpandOffset.Vrtc };
        if (desc.origin)
          artboards.origin = { horizontal: desc.origin.Hrzn, vertical: desc.origin.Vrtc };
        if (desc.autoExpandEnabled !== void 0)
          artboards.autoExpandEnabled = desc.autoExpandEnabled;
        if (desc.autoNestEnabled !== void 0)
          artboards.autoNestEnabled = desc.autoNestEnabled;
        if (desc.autoPositionEnabled !== void 0)
          artboards.autoPositionEnabled = desc.autoPositionEnabled;
        artboards.shrinkwrapOnSaveEnabled = !!desc.shrinkwrapOnSaveEnabled;
        if (desc.docDefaultNewArtboardBackgroundColor)
          artboards.docDefaultNewArtboardBackgroundColor = (0, descriptor_1.parseColor)(desc.docDefaultNewArtboardBackgroundColor);
        if (desc.docDefaultNewArtboardBackgroundType !== void 0)
          artboards.docDefaultNewArtboardBackgroundType = desc.docDefaultNewArtboardBackgroundType;
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        var _a, _b, _c, _d, _e;
        const artb = target.artboards;
        const desc = {
          "Cnt ": artb.count,
          autoExpandOffset: artb.autoExpandOffset ? { Hrzn: artb.autoExpandOffset.horizontal, Vrtc: artb.autoExpandOffset.vertical } : { Hrzn: 0, Vrtc: 0 },
          origin: artb.origin ? { Hrzn: artb.origin.horizontal, Vrtc: artb.origin.vertical } : { Hrzn: 0, Vrtc: 0 },
          autoExpandEnabled: (_a = artb.autoExpandEnabled) !== null && _a !== void 0 ? _a : true,
          autoNestEnabled: (_b = artb.autoNestEnabled) !== null && _b !== void 0 ? _b : true,
          autoPositionEnabled: (_c = artb.autoPositionEnabled) !== null && _c !== void 0 ? _c : true,
          shrinkwrapOnSaveEnabled: (_d = artb.shrinkwrapOnSaveEnabled) !== null && _d !== void 0 ? _d : true,
          docDefaultNewArtboardBackgroundColor: (0, descriptor_1.serializeColor)(artb.docDefaultNewArtboardBackgroundColor),
          docDefaultNewArtboardBackgroundType: (_e = artb.docDefaultNewArtboardBackgroundType) !== null && _e !== void 0 ? _e : 1
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc, "artd");
      }
    );
    function isGroupLayer(target) {
      return !!target.children;
    }
    function hasMultiEffects(effects) {
      return Object.keys(effects).map((key) => effects[key]).some((v) => Array.isArray(v) && v.length > 1);
    }
    addHandler("lfx2", (target) => target.effects !== void 0 && !isGroupLayer(target) && !hasMultiEffects(target.effects), (reader, target, left) => {
      const version = (0, psdReader_1.readUint32)(reader);
      if (version !== 0)
        throw new Error(`Invalid lfx2 version`);
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      target.effects = (0, descriptor_1.parseEffects)(desc, reader);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const desc = (0, descriptor_1.serializeEffects)(target.effects, writer, true);
      (0, psdWriter_1.writeUint32)(writer, 0);
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("cinf", hasKey("compositorUsed"), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      function enumValue(desc2) {
        return desc2.split(".")[1];
      }
      target.compositorUsed = {
        description: desc.description,
        reason: desc.reason,
        engine: enumValue(desc.Engn)
      };
      if (desc.Vrsn)
        target.compositorUsed.version = desc.Vrsn;
      if (desc.psVersion)
        target.compositorUsed.photoshopVersion = desc.psVersion;
      if (desc.enableCompCore)
        target.compositorUsed.enableCompCore = enumValue(desc.enableCompCore);
      if (desc.enableCompCoreGPU)
        target.compositorUsed.enableCompCoreGPU = enumValue(desc.enableCompCoreGPU);
      if (desc.enableCompCoreThreads)
        target.compositorUsed.enableCompCoreThreads = enumValue(desc.enableCompCoreThreads);
      if (desc.compCoreSupport)
        target.compositorUsed.compCoreSupport = enumValue(desc.compCoreSupport);
      if (desc.compCoreGPUSupport)
        target.compositorUsed.compCoreGPUSupport = enumValue(desc.compCoreGPUSupport);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      const cinf = target.compositorUsed;
      const desc = {
        Vrsn: cinf.version || { major: 1, minor: 0, fix: 0 }
      };
      if (cinf.photoshopVersion)
        desc.psVersion = cinf.photoshopVersion;
      desc.description = cinf.description;
      desc.reason = cinf.reason;
      desc.Engn = `Engn.${cinf.engine}`;
      if (cinf.enableCompCore)
        desc.enableCompCore = `enable.${cinf.enableCompCore}`;
      if (cinf.enableCompCoreGPU)
        desc.enableCompCoreGPU = `enable.${cinf.enableCompCoreGPU}`;
      if (cinf.enableCompCoreThreads)
        desc.enableCompCoreThreads = `enable.${cinf.enableCompCoreThreads}`;
      if (cinf.compCoreSupport)
        desc.compCoreSupport = `reason.${cinf.compCoreSupport}`;
      if (cinf.compCoreGPUSupport)
        desc.compCoreGPUSupport = `reason.${cinf.compCoreGPUSupport}`;
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", desc);
    });
    addHandler("extn", (target) => target.generatorSettings !== void 0 && isDocument(target), (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if (desc.generatorSettings)
        target.generatorSettings = parseGeneratorSettings(desc.generatorSettings);
      (0, psdReader_1.skipBytes)(reader, left());
    }, (writer, target) => {
      (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "null", serializeGeneratorSettings(target.generatorSettings));
    });
    addHandler("extd", () => false, (reader, target, left) => {
      const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
      if (desc.generatorSettings && target.generatorSettings === void 0) {
        target.generatorSettings = parseGeneratorSettings(desc.generatorSettings);
      }
      (0, psdReader_1.skipBytes)(reader, left());
    }, () => {
    });
    addHandler(
      "frgb",
      // frame tool group
      hasKey("framedGroup"),
      (reader, target, left) => {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        const rect = desc.framedGroupRect;
        target.framedGroup = {
          rect: { top: rect["Top "], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
          type: desc.framedGroupType
        };
        if (desc.LockPPI !== void 0)
          target.framedGroup.lockPPI = desc.LockPPI;
        if (desc.PreferredResolution !== void 0)
          target.framedGroup.preferredResolution = desc.PreferredResolution;
        if (desc.SavedIteratedName !== void 0)
          target.framedGroup.savedIteratedName = desc.SavedIteratedName;
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        const group = target.framedGroup;
        const rect = group.rect;
        const desc = {
          framedGroupRect: { _name: "", _classID: "classFloatRect", "Top ": rect.top, Left: rect.left, Btom: rect.bottom, Rght: rect.right },
          framedGroupType: group.type
        };
        if (group.lockPPI !== void 0)
          desc.LockPPI = group.lockPPI;
        if (group.preferredResolution !== void 0)
          desc.PreferredResolution = group.preferredResolution;
        if (group.savedIteratedName !== void 0)
          desc.SavedIteratedName = group.savedIteratedName;
        (0, descriptor_1.writeVersionAndDescriptor)(writer, "", "framedGroup", desc);
      }
    );
    addHandler("anFX", hasKey("animationEffects"), (reader, target, left) => {
      target.animationEffects = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
      (0, psdWriter_1.writeBytes)(writer, target.animationEffects);
    });
    addHandler(
      "PxSD",
      // pixel source data 2 (video layer frames)
      hasKey("pixelSourceData"),
      (reader, target, left) => {
        target.pixelSourceData = [];
        while (left() >= 8) {
          const length = readLength64(reader);
          if (length > left())
            throw new Error("Invalid PxSD data length");
          target.pixelSourceData.push((0, psdReader_1.readBytes)(reader, length));
        }
        (0, psdReader_1.skipBytes)(reader, left());
      },
      (writer, target) => {
        for (const data of target.pixelSourceData) {
          (0, psdWriter_1.writeUint32)(writer, 0);
          (0, psdWriter_1.writeUint32)(writer, data.byteLength);
          (0, psdWriter_1.writeBytes)(writer, data);
        }
      }
    );
    addHandler("iOpa", hasKey("fillOpacity"), (reader, target) => {
      target.fillOpacity = (0, psdReader_1.readUint8)(reader) / 255;
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, Math.round((0, helpers_1.clamp)(target.fillOpacity, 0, 1) * 255));
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
    addHandler("brst", hasKey("channelBlendingRestrictions"), (reader, target, left) => {
      target.channelBlendingRestrictions = [];
      while (left() >= 4) {
        target.channelBlendingRestrictions.push((0, psdReader_1.readInt32)(reader));
      }
    }, (writer, target) => {
      for (const channel of target.channelBlendingRestrictions) {
        (0, psdWriter_1.writeInt32)(writer, channel);
      }
    });
    addHandler("tsly", hasKey("transparencyShapesLayer"), (reader, target) => {
      target.transparencyShapesLayer = !!(0, psdReader_1.readUint8)(reader);
      (0, psdReader_1.skipBytes)(reader, 3);
    }, (writer, target) => {
      (0, psdWriter_1.writeUint8)(writer, target.transparencyShapesLayer ? 1 : 0);
      (0, psdWriter_1.writeZeros)(writer, 3);
    });
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/psdWriter.js
var require_psdWriter = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/psdWriter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createWriter = createWriter;
    exports.getWriterBuffer = getWriterBuffer;
    exports.getWriterBufferNoCopy = getWriterBufferNoCopy;
    exports.writeUint8 = writeUint8;
    exports.writeInt16 = writeInt16;
    exports.writeUint16 = writeUint16;
    exports.writeUint16LE = writeUint16LE;
    exports.writeInt32 = writeInt32;
    exports.writeInt32LE = writeInt32LE;
    exports.writeUint32 = writeUint32;
    exports.writeFloat32 = writeFloat32;
    exports.writeFloat64 = writeFloat64;
    exports.writeFixedPoint32 = writeFixedPoint32;
    exports.writeFixedPointPath32 = writeFixedPointPath32;
    exports.writeBytes = writeBytes;
    exports.writeZeros = writeZeros;
    exports.writeSignature = writeSignature;
    exports.writeAsciiString = writeAsciiString;
    exports.writePascalString = writePascalString;
    exports.writeUnicodeStringWithoutLength = writeUnicodeStringWithoutLength;
    exports.writeUnicodeStringWithoutLengthLE = writeUnicodeStringWithoutLengthLE;
    exports.writeUnicodeString = writeUnicodeString;
    exports.writeUnicodeStringWithPadding = writeUnicodeStringWithPadding;
    exports.getRLEChannelBound = getRLEChannelBound;
    exports.writeUint64 = writeUint64;
    exports.writeSection = writeSection;
    exports.writePsd = writePsd2;
    exports.writeColor = writeColor;
    exports.writePattern = writePattern;
    var helpers_1 = require_helpers();
    var pako_1 = require_pako();
    var additionalInfo_1 = require_additionalInfo();
    var imageResources_1 = require_imageResources();
    var psdReader_1 = require_psdReader();
    function createWriter(size = 4096) {
      const buffer = new ArrayBuffer(size);
      const view = new DataView(buffer);
      const offset = 0;
      return { buffer, view, offset, tempBuffer: void 0, log: console.log };
    }
    function getWriterBuffer(writer) {
      return writer.buffer.slice(0, writer.offset);
    }
    function getWriterBufferNoCopy(writer) {
      return new Uint8Array(writer.buffer, 0, writer.offset);
    }
    function writeUint8(writer, value) {
      const offset = addSize(writer, 1);
      writer.view.setUint8(offset, value);
    }
    function writeInt16(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setInt16(offset, value, false);
    }
    function writeUint16(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setUint16(offset, value, false);
    }
    function writeUint16LE(writer, value) {
      const offset = addSize(writer, 2);
      writer.view.setUint16(offset, value, true);
    }
    function writeInt32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setInt32(offset, value, false);
    }
    function writeInt32LE(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setInt32(offset, value, true);
    }
    function writeUint32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setUint32(offset, value, false);
    }
    function writeFloat32(writer, value) {
      const offset = addSize(writer, 4);
      writer.view.setFloat32(offset, value, false);
    }
    function writeFloat64(writer, value) {
      const offset = addSize(writer, 8);
      writer.view.setFloat64(offset, value, false);
    }
    function writeFixedPoint32(writer, value) {
      writeInt32(writer, value * (1 << 16));
    }
    function writeFixedPointPath32(writer, value) {
      writeInt32(writer, value * (1 << 24));
    }
    function writeBytes(writer, buffer) {
      if (buffer) {
        ensureSize(writer, writer.offset + buffer.length);
        const bytes = new Uint8Array(writer.buffer);
        bytes.set(buffer, writer.offset);
        writer.offset += buffer.length;
      }
    }
    function writeZeros(writer, count) {
      for (let i = 0; i < count; i++) {
        writeUint8(writer, 0);
      }
    }
    function writeSignature(writer, signature) {
      if (signature.length !== 4)
        throw new Error(`Invalid signature: '${signature}'`);
      for (let i = 0; i < 4; i++) {
        writeUint8(writer, signature.charCodeAt(i));
      }
    }
    function writeAsciiString(writer, text) {
      for (let i = 0; i < text.length; i++) {
        writeUint8(writer, text.charCodeAt(i));
      }
    }
    function writePascalString(writer, text, padTo) {
      let length = text.length;
      if (length > 255)
        throw new Error(`String too long`);
      writeUint8(writer, length);
      for (let i = 0; i < length; i++) {
        const code = text.charCodeAt(i);
        writeUint8(writer, code < 128 ? code : "?".charCodeAt(0));
      }
      while (++length % padTo) {
        writeUint8(writer, 0);
      }
    }
    function writeUnicodeStringWithoutLength(writer, text) {
      for (let i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
      }
    }
    function writeUnicodeStringWithoutLengthLE(writer, text) {
      for (let i = 0; i < text.length; i++) {
        writeUint16LE(writer, text.charCodeAt(i));
      }
    }
    function writeUnicodeString(writer, text) {
      writeUint32(writer, text.length);
      writeUnicodeStringWithoutLength(writer, text);
    }
    function writeUnicodeStringWithPadding(writer, text) {
      writeUint32(writer, text.length + 1);
      for (let i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
      }
      writeUint16(writer, 0);
    }
    function getRLEChannelBound(width, height, large) {
      return height * ((large ? 4 : 2) + width + Math.ceil(width / 128));
    }
    function getLargestLayerSize(layers = [], large) {
      let max = 0;
      for (const layer of layers) {
        for (const target of [layer, layer.mask, layer.realMask]) {
          if (target) {
            const { width, height } = getLayerDimentions(target);
            max = Math.max(max, getRLEChannelBound(width, height, large));
          }
        }
        if (layer.children) {
          max = Math.max(max, getLargestLayerSize(layer.children, large));
        }
      }
      return max;
    }
    function writeUint64(writer, value) {
      writeUint32(writer, Math.floor(value / 4294967296));
      writeUint32(writer, value >>> 0);
    }
    function writeSection(writer, round, func, writeTotalLength = false, large = false) {
      const offset = writer.offset;
      if (large)
        writeUint32(writer, 0);
      writeUint32(writer, 0);
      const start = writer.offset;
      func();
      let length = writer.offset - start;
      let len = length;
      while (len % round) {
        writeUint8(writer, 0);
        len++;
      }
      if (writeTotalLength) {
        length = len;
      }
      if (large) {
        writer.view.setUint32(offset, Math.floor(length / 4294967296), false);
        writer.view.setUint32(offset + 4, length >>> 0, false);
      } else {
        if (length > 4294967295)
          throw new Error("Section too large, use PSB format instead");
        writer.view.setUint32(offset, length, false);
      }
    }
    function verifyPixelData(data, name) {
      const bytesPerElement = data && data.data.BYTES_PER_ELEMENT;
      if (bytesPerElement !== void 0 && bytesPerElement !== 1 && bytesPerElement !== 2 && !(data.data instanceof Float32Array)) {
        throw new Error(`${name} has incorrect bitDepth (only Uint8Array, Uint8ClampedArray, Uint16Array and Float32Array data is supported for writing)`);
      }
    }
    var writeBitDepths = {
      [
        0
        /* ColorMode.Bitmap */
      ]: [1],
      [
        1
        /* ColorMode.Grayscale */
      ]: [8, 16, 32],
      [
        2
        /* ColorMode.Indexed */
      ]: [8],
      [
        3
        /* ColorMode.RGB */
      ]: [8, 16, 32],
      [
        4
        /* ColorMode.CMYK */
      ]: [8, 16]
    };
    var colorModeNames = {
      [
        0
        /* ColorMode.Bitmap */
      ]: "Bitmap",
      [
        1
        /* ColorMode.Grayscale */
      ]: "Grayscale",
      [
        2
        /* ColorMode.Indexed */
      ]: "Indexed",
      [
        3
        /* ColorMode.RGB */
      ]: "RGB",
      [
        4
        /* ColorMode.CMYK */
      ]: "CMYK",
      [
        7
        /* ColorMode.Multichannel */
      ]: "Multichannel",
      [
        8
        /* ColorMode.Duotone */
      ]: "Duotone",
      [
        9
        /* ColorMode.Lab */
      ]: "Lab"
    };
    function colorChannelsCount(colorMode) {
      return colorMode === 3 ? 3 : colorMode === 4 ? 4 : 1;
    }
    var hdrToningData = [
      104,
      100,
      114,
      116,
      0,
      0,
      0,
      3,
      62,
      107,
      133,
      31,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      7,
      0,
      76,
      0,
      105,
      0,
      110,
      0,
      101,
      0,
      97,
      0,
      114,
      0,
      0,
      0,
      2,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      255,
      0,
      255,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      65,
      128,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      63,
      128,
      0,
      0,
      104,
      100,
      114,
      97,
      0,
      0,
      0,
      6,
      0,
      0,
      0,
      0,
      65,
      160,
      0,
      0,
      65,
      240,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      63,
      128,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ];
    function verifyBitCount(target) {
      var _a, _b, _c;
      (_a = target.children) === null || _a === void 0 ? void 0 : _a.forEach(verifyBitCount);
      verifyPixelData(target.imageData, "imageData");
      if ("mask" in target)
        verifyPixelData((_b = target.mask) === null || _b === void 0 ? void 0 : _b.imageData, "mask imageData");
      if ("realMask" in target)
        verifyPixelData((_c = target.realMask) === null || _c === void 0 ? void 0 : _c.imageData, "realMask imageData");
    }
    function writePsd2(writer, psd, options = {}) {
      var _a, _b, _c, _d;
      if (!(+psd.width > 0 && +psd.height > 0))
        throw new Error("Invalid document size");
      if ((psd.width > 3e4 || psd.height > 3e4) && !options.psb)
        throw new Error("Document size is too large (max is 30000x30000, use PSB format instead)");
      const colorMode = (_a = psd.colorMode) !== null && _a !== void 0 ? _a : 3;
      const bitsPerChannel = (_b = psd.bitsPerChannel) !== null && _b !== void 0 ? _b : colorMode === 0 ? 1 : 8;
      const bitDepths = writeBitDepths[colorMode];
      if (!bitDepths)
        throw new Error(`${(_c = colorModeNames[colorMode]) !== null && _c !== void 0 ? _c : colorMode} color mode is not supported for writing`);
      if (bitDepths.indexOf(bitsPerChannel) === -1)
        throw new Error(`bitsPerChannel ${bitsPerChannel} is not supported for writing in ${colorModeNames[colorMode]} color mode`);
      const layersAllowed = colorMode !== 0 && colorMode !== 2;
      if (!layersAllowed && ((_d = psd.children) === null || _d === void 0 ? void 0 : _d.length))
        throw new Error(`Layers are not supported in ${colorModeNames[colorMode]} color mode`);
      if (colorMode === 2 && !psd.palette)
        throw new Error("Missing color palette for Indexed color mode");
      if (options.log)
        writer.log = options.log;
      if (options.logMissingFeatures)
        writer.logMissingFeatures = true;
      const layers = [];
      addChildren(layers, psd.children);
      if (!layers.length && layersAllowed)
        layers.push({});
      verifyBitCount(psd);
      const imageResources = Object.assign({}, psd.imageResources);
      const opt = Object.assign(Object.assign({}, options), { layerIds: /* @__PURE__ */ new Set(), layerToId: /* @__PURE__ */ new Map(), colorMode, bitsPerChannel });
      const layersInGlobalInfo = bitsPerChannel === 16 || bitsPerChannel === 32;
      if (opt.generateThumbnail) {
        imageResources.thumbnail = createThumbnail(psd);
      }
      let imageData = psd.imageData;
      if (!imageData && psd.canvas) {
        imageData = psd.canvas.getContext("2d").getImageData(0, 0, psd.canvas.width, psd.canvas.height);
      }
      if (!imageData && psd.rawCompositeData) {
        imageData = (0, psdReader_1.getCompositeImageData)(psd);
      }
      if (imageData && (psd.width !== imageData.width || psd.height !== imageData.height))
        throw new Error("Document canvas must have the same size as document");
      const globalAlpha = !!imageData && layersAllowed && (0, helpers_1.hasAlpha)(imageData);
      writer.tempBuffer = new Uint8Array(getLargestLayerSize(psd.children, !!options.psb));
      writeSignature(writer, "8BPS");
      writeUint16(writer, options.psb ? 2 : 1);
      writeZeros(writer, 6);
      writeUint16(writer, colorChannelsCount(colorMode) + (globalAlpha ? 1 : 0));
      writeUint32(writer, psd.height);
      writeUint32(writer, psd.width);
      writeUint16(writer, bitsPerChannel);
      writeUint16(writer, colorMode);
      writeSection(writer, 1, () => {
        var _a2, _b2, _c2, _d2, _e, _f;
        if (colorMode === 2) {
          const palette = psd.palette;
          for (let i = 0; i < 256; i++)
            writeUint8(writer, (_b2 = (_a2 = palette[i]) === null || _a2 === void 0 ? void 0 : _a2.r) !== null && _b2 !== void 0 ? _b2 : 0);
          for (let i = 0; i < 256; i++)
            writeUint8(writer, (_d2 = (_c2 = palette[i]) === null || _c2 === void 0 ? void 0 : _c2.g) !== null && _d2 !== void 0 ? _d2 : 0);
          for (let i = 0; i < 256; i++)
            writeUint8(writer, (_f = (_e = palette[i]) === null || _e === void 0 ? void 0 : _e.b) !== null && _f !== void 0 ? _f : 0);
        } else if (bitsPerChannel === 32) {
          writeBytes(writer, new Uint8Array(hdrToningData));
        }
      });
      imageResources.layersGroup = layers.map((l) => l.linkGroup || 0);
      imageResources.layerGroupsEnabledId = layers.map((l) => l.linkGroupEnabled == false ? 0 : 1);
      writeSection(writer, 1, () => {
        for (const handler of imageResources_1.resourceHandlers) {
          const has = handler.has(imageResources);
          const count = has === false ? 0 : has === true ? 1 : has;
          for (let i = 0; i < count; i++) {
            const id = handler.keyCount > 1 ? handler.key + i : handler.key;
            const name = handler.name ? handler.name(imageResources, i) : "";
            writeSignature(writer, "8BIM");
            writeUint16(writer, id);
            writePascalString(writer, name, 2);
            writeSection(writer, 2, () => handler.write(writer, imageResources, i, psd));
          }
        }
      });
      writeSection(writer, 2, () => {
        if (layersInGlobalInfo || !layersAllowed) {
          writeSection(writer, 4, () => {
          }, true, opt.psb);
        } else {
          writeLayerInfo(writer, layers, psd, globalAlpha, opt);
        }
        writeGlobalLayerMaskInfo(writer, psd.globalLayerMaskInfo);
        if (layersInGlobalInfo) {
          if (globalAlpha)
            writeGlobalInfoSection(writer, bitsPerChannel === 16 ? "Mt16" : "Mt32", !!opt.psb, () => {
            });
          writeGlobalInfoSection(writer, bitsPerChannel === 16 ? "Lr16" : "Lr32", !!opt.psb, () => {
            writeLayerInfoData(writer, layers, psd, globalAlpha, opt);
          });
        }
        writeAdditionalLayerInfo(writer, psd, psd, opt);
      }, void 0, !!opt.psb);
      writer.tempBuffer = void 0;
      if (colorMode === 3 && bitsPerChannel === 8 && (!imageData || is8bit(imageData))) {
        writeUint16(
          writer,
          1
          /* Compression.RleCompressed */
        );
        const channels = globalAlpha ? [0, 1, 2, 3] : [0, 1, 2];
        const data = getCompositeData(imageData, psd.width, psd.height, globalAlpha);
        const maxSize = channels.length * getRLEChannelBound(data.width, data.height, !!options.psb);
        ensureSize(writer, writer.offset + maxSize);
        const buffer = new Uint8Array(writer.buffer, writer.offset, maxSize);
        writer.offset += (0, helpers_1.writeDataRLE)(buffer, data, channels, !!options.psb).length;
      } else {
        writeCompositeImageData(writer, psd, imageData, colorMode, bitsPerChannel, globalAlpha, !!options.psb);
      }
    }
    function writeGlobalInfoSection(writer, key, psb, func) {
      writeSignature(writer, psb ? "8B64" : "8BIM");
      writeSignature(writer, key);
      writeSection(writer, 4, func, false, psb);
    }
    function is8bit(data) {
      return data.data.BYTES_PER_ELEMENT === 1;
    }
    function getPlanarChannels(imageData, colorMode, bitsPerChannel, matte) {
      const { data, width, height } = imageData;
      const size = width * height;
      const srcFloat = data instanceof Float32Array;
      const srcMax = srcFloat ? 1 : data instanceof Uint16Array ? 65535 : 255;
      const dstFloat = bitsPerChannel === 32;
      const dstMax = dstFloat ? 1 : bitsPerChannel === 16 ? 65535 : 255;
      const colorCount = colorChannelsCount(colorMode);
      const create = () => dstFloat ? new Float32Array(size) : bitsPerChannel === 16 ? new Uint16Array(size) : new Uint8Array(size);
      const colors = [];
      for (let i = 0; i < colorCount; i++)
        colors.push(create());
      const alpha = create();
      const toNormalized = (v) => srcFloat ? Math.pow((0, helpers_1.clamp)(v, 0, 1), 1 / 2.2) : v / srcMax;
      const fromNormalized = (v) => dstFloat ? Math.pow(v, 2.2) : Math.round((0, helpers_1.clamp)(v, 0, 1) * dstMax);
      const sameType = srcFloat === dstFloat && srcMax === dstMax;
      const convertColor = (v) => sameType ? dstFloat ? v : Math.round(v) : fromNormalized(toNormalized(v));
      const convertAlpha = (v) => sameType ? v : dstFloat ? v / srcMax : Math.round((0, helpers_1.clamp)(v / srcMax, 0, 1) * dstMax);
      const cmyk = [0, 0, 0, 0];
      for (let i = 0, p = 0; i < size; i++, p += 4) {
        const a = data[p + 3];
        const alphaValue = convertAlpha(a);
        alpha[i] = alphaValue;
        const blend = matte && a !== srcMax && a > 0 ? (0, helpers_1.clamp)(a / srcMax, 0, 1) : 1;
        if (colorMode === 4) {
          (0, helpers_1.rgbToCmykValues)(toNormalized(data[p]), toNormalized(data[p + 1]), toNormalized(data[p + 2]), cmyk);
          for (let j = 0; j < 4; j++) {
            colors[j][i] = Math.round((1 - (0, helpers_1.clamp)(cmyk[j] * blend, 0, 1)) * dstMax);
          }
        } else {
          for (let j = 0; j < colorCount; j++) {
            let value;
            if (colorMode === 3) {
              value = convertColor(data[p + j]);
            } else {
              const r = data[p], g = data[p + 1], b = data[p + 2];
              value = convertColor(r === g && g === b ? r : 0.299 * r + 0.587 * g + 0.114 * b);
            }
            if (blend !== 1)
              value = dstFloat ? value * blend + 1 - blend : Math.round(value * blend + dstMax * (1 - blend));
            colors[j][i] = value;
          }
        }
      }
      return { colors, alpha };
    }
    function encodeChannel(values, width, height, options) {
      if (!(values instanceof Uint8Array)) {
        return {
          data: (0, helpers_1.writeDataZipWithPrediction)(values, width, height),
          compression: 3
          /* Compression.ZipWithPrediction */
        };
      } else if (options.compress) {
        return {
          data: (0, pako_1.deflate)(values),
          compression: 2
          /* Compression.ZipWithoutPrediction */
        };
      } else {
        return {
          data: (0, helpers_1.writeDataRLEBytes)(values, width, height, !!options.psb),
          compression: 1
          /* Compression.RleCompressed */
        };
      }
    }
    function writeCompositeImageData(writer, psd, imageData, colorMode, bitsPerChannel, globalAlpha, psb) {
      var _a;
      const { width, height } = psd;
      const data = imageData !== null && imageData !== void 0 ? imageData : { data: new Uint8Array(width * height * 4), width, height };
      const parts = [];
      if (colorMode === 0 || colorMode === 2) {
        const values = colorMode === 0 ? getBitmapData(data) : getIndexedData(data, psd.palette, (_a = psd.imageResources) === null || _a === void 0 ? void 0 : _a.transparencyIndex);
        const rowBytes = colorMode === 0 ? Math.ceil(width / 8) : width;
        if (colorMode === 0) {
          writeUint16(
            writer,
            0
            /* Compression.RawData */
          );
          parts.push(values);
        } else {
          writeUint16(
            writer,
            1
            /* Compression.RleCompressed */
          );
          parts.push((0, helpers_1.writeDataRLEBytes)(values, rowBytes, height, psb));
        }
      } else {
        const { colors, alpha } = getPlanarChannels(data, colorMode, bitsPerChannel, globalAlpha);
        const channels = globalAlpha ? [...colors, alpha] : colors;
        if (bitsPerChannel === 8) {
          const encoded = channels.map((c) => (0, helpers_1.writeDataRLEBytes)(c, width, height, psb));
          const countsSize = height * (psb ? 4 : 2);
          writeUint16(
            writer,
            1
            /* Compression.RleCompressed */
          );
          for (const e of encoded)
            parts.push(e.subarray(0, countsSize));
          for (const e of encoded)
            parts.push(e.subarray(countsSize));
        } else {
          writeUint16(
            writer,
            0
            /* Compression.RawData */
          );
          for (const c of channels)
            parts.push((0, helpers_1.planarToBytes)(c));
        }
      }
      for (const part of parts)
        writeBytes(writer, part);
    }
    function getBitmapData({ data, width, height }) {
      const rowBytes = Math.ceil(width / 8);
      const result = new Uint8Array(rowBytes * height);
      const max = data instanceof Float32Array ? 1 : data instanceof Uint16Array ? 65535 : 255;
      for (let y = 0, p = 0; y < height; y++) {
        for (let x = 0; x < width; x++, p += 4) {
          const a = data[p + 3] / max;
          const value = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / max * a + (1 - a);
          if (value < 0.5)
            result[y * rowBytes + (x >> 3)] |= 128 >> (x & 7);
        }
      }
      return result;
    }
    function getIndexedData({ data, width, height }, palette, transparencyIndex) {
      const size = width * height;
      const result = new Uint8Array(size);
      const shift = data instanceof Uint16Array ? 8 : 0;
      const cache = /* @__PURE__ */ new Map();
      for (let i = 0; i < palette.length && i < 256; i++) {
        const key = palette[i].r << 16 | palette[i].g << 8 | palette[i].b;
        if (i !== transparencyIndex && !cache.has(key))
          cache.set(key, i);
      }
      for (let i = 0, p = 0; i < size; i++, p += 4) {
        const read = (v) => data instanceof Float32Array ? Math.round(Math.pow((0, helpers_1.clamp)(v, 0, 1), 1 / 2.2) * 255) : v >>> shift;
        const a = data instanceof Float32Array ? data[p + 3] * 255 : data[p + 3] >>> shift;
        if (transparencyIndex !== void 0 && transparencyIndex >= 0 && a < 128) {
          result[i] = transparencyIndex;
          continue;
        }
        const r = read(data[p]), g = read(data[p + 1]), b = read(data[p + 2]);
        const key = r << 16 | g << 8 | b;
        let index = cache.get(key);
        if (index === void 0) {
          let best = Infinity;
          index = 0;
          for (let j = 0; j < palette.length && j < 256; j++) {
            if (j === transparencyIndex)
              continue;
            const dr = palette[j].r - r, dg = palette[j].g - g, db = palette[j].b - b;
            const distance = dr * dr + dg * dg + db * db;
            if (distance < best) {
              best = distance;
              index = j;
            }
          }
          cache.set(key, index);
        }
        result[i] = index;
      }
      return result;
    }
    function getCompositeData(imageData, width, height, globalAlpha) {
      if (!imageData)
        return { data: new Uint8Array(width * height * 4), width, height };
      const size = width * height * 4;
      const src = imageData.data;
      let dst = void 0;
      if (globalAlpha) {
        for (let i = 0; i < size; i += 4) {
          const pa = src[i + 3];
          if (pa != 0 && pa != 255) {
            if (!dst)
              dst = new Uint8Array(src.buffer, src.byteOffset, size).slice();
            const a = pa / 255;
            const ra = 255 * (1 - a);
            dst[i + 0] = src[i + 0] * a + ra;
            dst[i + 1] = src[i + 1] * a + ra;
            dst[i + 2] = src[i + 2] * a + ra;
          }
        }
      }
      return dst ? { data: dst, width, height } : imageData;
    }
    function writeLayerInfo(writer, layers, psd, globalAlpha, options) {
      writeSection(writer, 4, () => writeLayerInfoData(writer, layers, psd, globalAlpha, options), true, options.psb);
    }
    function writeLayerInfoData(writer, layers, psd, globalAlpha, options) {
      var _a;
      writeInt16(writer, globalAlpha ? -layers.length : layers.length);
      const layersData = layers.map((l, i) => getChannels(writer, l, i === 0, options));
      for (const layerData of layersData) {
        const { layer, top, left, bottom, right, channels } = layerData;
        writeInt32(writer, top);
        writeInt32(writer, left);
        writeInt32(writer, bottom);
        writeInt32(writer, right);
        writeUint16(writer, channels.length);
        for (const c of channels) {
          writeInt16(writer, c.id);
          if (options.psb) {
            writeUint64(writer, c.length);
          } else {
            writeUint32(writer, c.length);
          }
        }
        writeSignature(writer, "8BIM");
        writeSignature(writer, helpers_1.fromBlendMode[layer.blendMode] || "norm");
        writeUint8(writer, Math.round((0, helpers_1.clamp)((_a = layer.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 255));
        writeUint8(writer, layer.clipping ? 1 : 0);
        let flags = 8;
        if (layer.transparencyProtected)
          flags |= 1;
        if (layer.hidden)
          flags |= 2;
        if (layer.vectorMask || layer.sectionDivider && layer.sectionDivider.type !== 0 || layer.adjustment) {
          flags |= 16;
        }
        if (layer.effectsOpen)
          flags |= 32;
        writeUint8(writer, flags);
        writeUint8(writer, 0);
        writeSection(writer, 1, () => {
          writeLayerMaskData(writer, layer, layerData);
          writeLayerBlendingRanges(writer, layer);
          writePascalString(writer, (layer.name || "").substring(0, 255), 4);
          writeAdditionalLayerInfo(writer, layer, psd, options);
        });
      }
      for (const layerData of layersData) {
        for (const channel of layerData.channels) {
          writeUint16(writer, channel.compression);
          if (channel.data) {
            writeBytes(writer, channel.data);
          }
        }
      }
    }
    function getMasks(layer) {
      return layer.mask ? { mask: layer.mask, realMask: layer.realMask } : { mask: layer.realMask, realMask: void 0 };
    }
    function writeLayerMaskData(writer, layer, layerData) {
      const { mask, realMask } = getMasks(layer);
      writeSection(writer, 4, () => {
        if (!mask && !realMask)
          return;
        let params = 0, flags = 0, realFlags = 0;
        if (mask) {
          if (mask.userMaskDensity !== void 0)
            params |= 1;
          if (mask.userMaskFeather !== void 0)
            params |= 2;
          if (mask.vectorMaskDensity !== void 0)
            params |= 4;
          if (mask.vectorMaskFeather !== void 0)
            params |= 8;
          if (mask.disabled)
            flags |= 2;
          if (mask.positionRelativeToLayer)
            flags |= 1;
          if (mask.fromVectorData)
            flags |= 8;
          if (params)
            flags |= 16;
        }
        const m = layerData.mask || {};
        writeInt32(writer, m.top || 0);
        writeInt32(writer, m.left || 0);
        writeInt32(writer, m.bottom || 0);
        writeInt32(writer, m.right || 0);
        writeUint8(writer, mask && mask.defaultColor || 0);
        writeUint8(writer, flags);
        if (realMask) {
          if (realMask.disabled)
            realFlags |= 2;
          if (realMask.positionRelativeToLayer)
            realFlags |= 1;
          if (realMask.fromVectorData)
            realFlags |= 8;
          const r = layerData.realMask || {};
          writeUint8(writer, realFlags);
          writeUint8(writer, realMask.defaultColor || 0);
          writeInt32(writer, r.top || 0);
          writeInt32(writer, r.left || 0);
          writeInt32(writer, r.bottom || 0);
          writeInt32(writer, r.right || 0);
        }
        if (params && mask) {
          writeUint8(writer, params);
          if (mask.userMaskDensity !== void 0)
            writeUint8(writer, Math.round(mask.userMaskDensity * 255));
          if (mask.userMaskFeather !== void 0)
            writeFloat64(writer, mask.userMaskFeather);
          if (mask.vectorMaskDensity !== void 0)
            writeUint8(writer, Math.round(mask.vectorMaskDensity * 255));
          if (mask.vectorMaskFeather !== void 0)
            writeFloat64(writer, mask.vectorMaskFeather);
        }
      }, true);
    }
    function writerBlendingRange(writer, range) {
      writeUint8(writer, range[0]);
      writeUint8(writer, range[1]);
      writeUint8(writer, range[2]);
      writeUint8(writer, range[3]);
    }
    function writeLayerBlendingRanges(writer, layer) {
      writeSection(writer, 1, () => {
        const ranges = layer.blendingRanges;
        if (ranges) {
          writerBlendingRange(writer, ranges.compositeGrayBlendSource);
          writerBlendingRange(writer, ranges.compositeGraphBlendDestinationRange);
          for (const r of ranges.ranges) {
            writerBlendingRange(writer, r.sourceRange);
            writerBlendingRange(writer, r.destRange);
          }
        }
      });
    }
    function writeGlobalLayerMaskInfo(writer, info) {
      writeSection(writer, 1, () => {
        if (info) {
          writeUint16(writer, info.overlayColorSpace);
          writeUint16(writer, info.colorSpace1);
          writeUint16(writer, info.colorSpace2);
          writeUint16(writer, info.colorSpace3);
          writeUint16(writer, info.colorSpace4);
          writeUint16(writer, Math.round((0, helpers_1.clamp)(info.opacity, 0, 1) * 100));
          writeUint8(writer, info.kind);
          writeZeros(writer, 3);
        }
      });
    }
    function writeAdditionalLayerInfo(writer, target, psd, options) {
      for (const handler of additionalInfo_1.infoHandlers) {
        let key = handler.key;
        if (key === "Txt2" && options.invalidateTextLayers)
          continue;
        if (key === "vmsk" && additionalInfo_1.infoHandlersMap["vscg"].has(target))
          key = "vsms";
        if (handler.has(target)) {
          const large = options.psb && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1;
          const writeTotalLength = key !== "Txt2" && key !== "cinf" && key !== "extn" && key !== "CAI " && key !== "OCIO";
          const fourBytes = key === "levl" || key === "Txt2" || key === "luni" || key === "vmsk" || key === "artb" || key === "artd" || key === "vogk" || key === "SoLd" || key === "SoLE" || key === "lnk2" || key === "vscg" || key === "vsms" || key === "GdFl" || key === "lmfx" || key === "lrFX" || key === "cinf" || key === "PlLd" || key === "Anno" || key === "CAI " || key === "OCIO" || key === "GenI" || key === "FEid" || key === "curv" || key === "CgEd" || key === "vibA" || key === "blwh" || key === "grdm";
          writeSignature(writer, large ? "8B64" : "8BIM");
          writeSignature(writer, key);
          writeSection(writer, fourBytes ? 4 : 2, () => {
            handler.write(writer, target, psd, options);
          }, writeTotalLength, large);
        }
      }
    }
    function addChildren(layers, children) {
      if (!children)
        return;
      for (const c of children) {
        if (c.children && c.canvas)
          throw new Error(`Invalid layer, cannot have both 'canvas' and 'children' properties`);
        if (c.children && c.imageData)
          throw new Error(`Invalid layer, cannot have both 'imageData' and 'children' properties`);
        if (c.children) {
          layers.push({
            name: "</Layer group>",
            sectionDivider: {
              type: 3
            }
            // blendingRanges: children[0].blendingRanges,
            // nameSource: 'lset',
            // id: layerIds.shift(),
            // protected: {
            // 	transparency: false,
            // 	composite: false,
            // 	position: false,
            // },
            // layerColor: 'red',
            // timestamp: timestamps.shift(),
            // referencePoint: { x: 0, y: 0 },
          });
          addChildren(layers, c.children);
          layers.push(Object.assign(Object.assign({}, c), { blendMode: c.blendMode === "pass through" ? "normal" : c.blendMode, sectionDivider: {
            type: c.opened === false ? 2 : 1,
            key: helpers_1.fromBlendMode[c.blendMode] || "pass",
            subType: 0
          } }));
        } else {
          layers.push(Object.assign({}, c));
        }
      }
    }
    function resizeBuffer(writer, size) {
      const newLength = Math.max(writer.buffer.byteLength * 2, size);
      const newBuffer = new ArrayBuffer(newLength);
      const newBytes = new Uint8Array(newBuffer);
      const oldBytes = new Uint8Array(writer.buffer);
      newBytes.set(oldBytes);
      writer.buffer = newBuffer;
      writer.view = new DataView(writer.buffer);
    }
    function ensureSize(writer, size) {
      if (size > writer.buffer.byteLength) {
        resizeBuffer(writer, size);
      }
    }
    function addSize(writer, size) {
      const offset = writer.offset;
      ensureSize(writer, writer.offset += size);
      return offset;
    }
    function createThumbnail(psd) {
      const canvas = (0, helpers_1.createCanvas)(10, 10);
      let scale = 1;
      if (psd.width > psd.height) {
        canvas.width = 160;
        canvas.height = Math.max(1, Math.floor(psd.height * (canvas.width / psd.width)));
        scale = canvas.width / psd.width;
      } else {
        canvas.height = 160;
        canvas.width = Math.max(1, Math.floor(psd.width * (canvas.height / psd.height)));
        scale = canvas.height / psd.height;
      }
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      if (psd.imageData) {
        context.drawImage((0, helpers_1.imageDataToCanvas)(psd.imageData), 0, 0);
      } else if (psd.canvas) {
        context.drawImage(psd.canvas, 0, 0);
      }
      return canvas;
    }
    function getMaskChannels(tempBuffer, layerData, mask, options, realMask) {
      var _a;
      let top = mask.top | 0;
      let left = mask.left | 0;
      let right = mask.right | 0;
      let bottom = mask.bottom | 0;
      let { width, height } = getLayerDimentions(mask);
      let imageData = mask.imageData;
      if (!imageData && mask.canvas && width && height) {
        imageData = mask.canvas.getContext("2d").getImageData(0, 0, width, height);
      }
      if (imageData && (imageData.width !== width || imageData.height !== height)) {
        throw new Error("Invalid imageData dimentions");
      }
      right = left + width;
      bottom = top + height;
      let buffer;
      let compression;
      const bitsPerChannel = (_a = options.bitsPerChannel) !== null && _a !== void 0 ? _a : 8;
      if (!imageData) {
        buffer = new Uint8Array(0);
        compression = 1;
      } else if (bitsPerChannel !== 8 || !is8bit(imageData)) {
        const { colors } = getPlanarChannels(imageData, 3, bitsPerChannel, false);
        ({ data: buffer, compression } = encodeChannel(colors[0], width, height, options));
      } else if (options.compress) {
        buffer = (0, helpers_1.writeDataZipWithoutPrediction)(imageData, [0]);
        compression = 2;
      } else {
        buffer = (0, helpers_1.writeDataRLE)(tempBuffer, imageData, [0], !!options.psb).slice();
        compression = 1;
      }
      layerData.channels.push({ id: realMask ? -3 : -2, compression, data: buffer, length: 2 + buffer.length });
      layerData[realMask ? "realMask" : "mask"] = { top, left, right, bottom };
    }
    function bounds(obj) {
      return obj ? {
        top: obj.top || 0,
        left: obj.left || 0,
        right: obj.right || 0,
        bottom: obj.bottom || 0
      } : void 0;
    }
    function getChannels(writer, layer, background, options) {
      var _a, _b;
      let source = layer;
      if (layer.rawData) {
        const { colorMode, bitsPerChannel, large } = layer.rawData;
        const opt = options;
        if (large === !!options.psb && colorMode === ((_a = opt.colorMode) !== null && _a !== void 0 ? _a : 3) && bitsPerChannel === ((_b = opt.bitsPerChannel) !== null && _b !== void 0 ? _b : 8)) {
          const { mask: mask2, realMask: realMask2 } = getMasks(layer);
          return Object.assign(Object.assign({ layer, channels: layer.rawData.channels.map((c) => {
            var _a2, _b2;
            return Object.assign(Object.assign({}, c), { length: 2 + ((_b2 = (_a2 = c.data) === null || _a2 === void 0 ? void 0 : _a2.byteLength) !== null && _b2 !== void 0 ? _b2 : 0) });
          }) }, bounds(layer)), { mask: bounds(mask2), realMask: bounds(realMask2) });
        }
        source = Object.assign(Object.assign({}, layer), { rawData: void 0, canvas: void 0, imageData: (0, psdReader_1.getLayerImageData)(layer), mask: layer.mask && Object.assign(Object.assign({}, layer.mask), { canvas: void 0, imageData: (0, psdReader_1.getLayerMaskImageData)(layer) }), realMask: layer.realMask && Object.assign(Object.assign({}, layer.realMask), { canvas: void 0, imageData: (0, psdReader_1.getLayerRealMaskImageData)(layer) }) });
        const size = getLargestLayerSize([Object.assign(Object.assign({}, source), { children: void 0 })], !!options.psb);
        if (writer.tempBuffer.byteLength < size)
          writer.tempBuffer = new Uint8Array(size);
      }
      const tempBuffer = writer.tempBuffer;
      const { mask, realMask } = getMasks(source);
      const layerData = getLayerChannels(tempBuffer, source, background, options);
      if (mask)
        getMaskChannels(tempBuffer, layerData, mask, options, false);
      if (realMask)
        getMaskChannels(tempBuffer, layerData, realMask, options, true);
      layerData.layer = layer;
      return layerData;
    }
    function getLayerDimentions({ canvas, imageData }) {
      var _a, _b, _c, _d;
      const width = (_b = (_a = imageData === null || imageData === void 0 ? void 0 : imageData.width) !== null && _a !== void 0 ? _a : canvas === null || canvas === void 0 ? void 0 : canvas.width) !== null && _b !== void 0 ? _b : 0;
      const height = (_d = (_c = imageData === null || imageData === void 0 ? void 0 : imageData.height) !== null && _c !== void 0 ? _c : canvas === null || canvas === void 0 ? void 0 : canvas.height) !== null && _d !== void 0 ? _d : 0;
      return { width, height };
    }
    function cropImageData(data, left, top, width, height) {
      const croppedData = is8bit(data) ? (0, helpers_1.createImageData)(width, height) : { width, height, data: new data.data.constructor(width * height * 4) };
      const srcData = data.data;
      const dstData = croppedData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let src = (x + left + (y + top) * data.width) * 4;
          let dst = (x + y * width) * 4;
          dstData[dst] = srcData[src];
          dstData[dst + 1] = srcData[src + 1];
          dstData[dst + 2] = srcData[src + 2];
          dstData[dst + 3] = srcData[src + 3];
        }
      }
      return croppedData;
    }
    function getLayerChannels(tempBuffer, layer, background, options) {
      var _a, _b;
      let top = layer.top | 0;
      let left = layer.left | 0;
      let right = layer.right | 0;
      let bottom = layer.bottom | 0;
      let channels = [
        { id: -1, compression: 0, data: void 0, length: 2 },
        { id: 0, compression: 0, data: void 0, length: 2 },
        { id: 1, compression: 0, data: void 0, length: 2 },
        { id: 2, compression: 0, data: void 0, length: 2 }
      ];
      let { width, height } = getLayerDimentions(layer);
      if (!(layer.canvas || layer.imageData) || !width || !height) {
        if (layer.right === void 0 || right > left)
          right = left;
        if (layer.bottom === void 0 || bottom > top)
          bottom = top;
        return { layer, top, left, right, bottom, channels };
      }
      right = left + width;
      bottom = top + height;
      let imageData = layer.imageData || layer.canvas.getContext("2d").getImageData(0, 0, width, height);
      if (options.trimImageData) {
        const trimmed = trimData(imageData);
        if (trimmed.left !== 0 || trimmed.top !== 0 || trimmed.right !== imageData.width || trimmed.bottom !== imageData.height) {
          left += trimmed.left;
          top += trimmed.top;
          right -= imageData.width - trimmed.right;
          bottom -= imageData.height - trimmed.bottom;
          width = right - left;
          height = bottom - top;
          if (!width || !height)
            return { layer, top, left, right, bottom, channels };
          imageData = cropImageData(imageData, trimmed.left, trimmed.top, width, height);
        }
      }
      const channelIds = [
        0,
        1,
        2
      ];
      if (!background || options.noBackground || layer.mask || (0, helpers_1.hasAlpha)(imageData)) {
        channelIds.unshift(
          -1
          /* ChannelID.Transparency */
        );
      }
      const colorMode = (_a = options.colorMode) !== null && _a !== void 0 ? _a : 3;
      const bitsPerChannel = (_b = options.bitsPerChannel) !== null && _b !== void 0 ? _b : 8;
      if (colorMode !== 3 || bitsPerChannel !== 8 || !is8bit(imageData)) {
        const { colors, alpha } = getPlanarChannels(imageData, colorMode, bitsPerChannel, false);
        const ids = channelIds[0] === -1 ? [
          -1
          /* ChannelID.Transparency */
        ] : [];
        for (let i = 0; i < colors.length; i++)
          ids.push(i);
        channels = ids.map((id) => {
          const { data, compression } = encodeChannel(id === -1 ? alpha : colors[id], width, height, options);
          return { id, compression, data, length: 2 + data.length };
        });
        return { layer, top, left, right, bottom, channels };
      }
      channels = channelIds.map((id) => {
        const offset = (0, helpers_1.offsetForChannel)(id, false);
        let data;
        let compression;
        if (options.compress) {
          data = (0, helpers_1.writeDataZipWithoutPrediction)(imageData, [offset]);
          compression = 2;
        } else {
          data = (0, helpers_1.writeDataRLE)(tempBuffer, imageData, [offset], !!options.psb).slice();
          compression = 1;
        }
        return { id, compression, data, length: 2 + data.length };
      });
      return { layer, top, left, right, bottom, channels };
    }
    function isRowEmpty({ data, width }, y, left, right) {
      const start = (y * width + left) * 4 + 3 | 0;
      const end = start + (right - left) * 4 | 0;
      for (let i = start; i < end; i = i + 4 | 0) {
        if (data[i] !== 0) {
          return false;
        }
      }
      return true;
    }
    function isColEmpty({ data, width }, x, top, bottom) {
      const stride = width * 4 | 0;
      const start = top * stride + x * 4 + 3 | 0;
      for (let y = top, i = start; y < bottom; y++, i = i + stride | 0) {
        if (data[i] !== 0) {
          return false;
        }
      }
      return true;
    }
    function trimData(data) {
      let top = 0;
      let left = 0;
      let right = data.width;
      let bottom = data.height;
      while (top < bottom && isRowEmpty(data, top, left, right))
        top++;
      while (bottom > top && isRowEmpty(data, bottom - 1, left, right))
        bottom--;
      while (left < right && isColEmpty(data, left, top, bottom))
        left++;
      while (right > left && isColEmpty(data, right - 1, top, bottom))
        right--;
      return { top, left, right, bottom };
    }
    function writeColor(writer, color) {
      if (!color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeZeros(writer, 8);
      } else if ("r" in color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeUint16(writer, Math.round(color.r * 257));
        writeUint16(writer, Math.round(color.g * 257));
        writeUint16(writer, Math.round(color.b * 257));
        writeUint16(writer, 0);
      } else if ("fr" in color) {
        writeUint16(
          writer,
          0
          /* ColorSpace.RGB */
        );
        writeUint16(writer, Math.round(color.fr * 255 * 257));
        writeUint16(writer, Math.round(color.fg * 255 * 257));
        writeUint16(writer, Math.round(color.fb * 255 * 257));
        writeUint16(writer, 0);
      } else if ("l" in color) {
        writeUint16(
          writer,
          7
          /* ColorSpace.Lab */
        );
        writeInt16(writer, Math.round(color.l * 1e4));
        writeInt16(writer, Math.round((0, helpers_1.denormalizeLabAB)(color.a, 100)));
        writeInt16(writer, Math.round((0, helpers_1.denormalizeLabAB)(color.b, 100)));
        writeUint16(writer, 0);
      } else if ("h" in color) {
        writeUint16(
          writer,
          1
          /* ColorSpace.HSB */
        );
        writeUint16(writer, Math.round(color.h * 65535));
        writeUint16(writer, Math.round(color.s * 65535));
        writeUint16(writer, Math.round(color.b * 65535));
        writeUint16(writer, 0);
      } else if ("c" in color) {
        writeUint16(
          writer,
          2
          /* ColorSpace.CMYK */
        );
        writeUint16(writer, 65535 - Math.round((0, helpers_1.clamp)(color.c, 0, 255) * 257));
        writeUint16(writer, 65535 - Math.round((0, helpers_1.clamp)(color.m, 0, 255) * 257));
        writeUint16(writer, 65535 - Math.round((0, helpers_1.clamp)(color.y, 0, 255) * 257));
        writeUint16(writer, 65535 - Math.round((0, helpers_1.clamp)(color.k, 0, 255) * 257));
      } else {
        writeUint16(
          writer,
          8
          /* ColorSpace.Grayscale */
        );
        writeUint16(writer, Math.round(color.k * 1e4 / 255));
        writeZeros(writer, 6);
      }
    }
    function writePattern(writer, pattern) {
      const width = pattern.bounds.w;
      const height = pattern.bounds.h;
      const pixelData = { width, height, data: pattern.data };
      writeUint32(writer, 0);
      const pattsOffset = writer.offset;
      writeUint32(writer, 1);
      writeUint32(
        writer,
        3
        /* ColorMode.RGB */
      );
      writeInt16(writer, pattern.x);
      writeInt16(writer, pattern.y);
      writeUnicodeString(writer, pattern.name + "\0");
      writePascalString(writer, pattern.id, 1);
      writeUint32(writer, 3);
      writeUint32(writer, 0);
      const vlOffset = writer.offset;
      const top = pattern.bounds.y;
      const left = pattern.bounds.x;
      const bottom = top + height;
      const right = left + width;
      writeUint32(writer, top);
      writeUint32(writer, left);
      writeUint32(writer, bottom);
      writeUint32(writer, right);
      writeUint32(writer, 24);
      const buffer = new Uint8Array(getRLEChannelBound(width, height, false));
      for (let i = 0; i < 24 + 2; i++) {
        const offset = i < 3 ? i : i === 25 ? 3 : -1;
        if (offset < 0) {
          writeUint32(writer, 0);
          continue;
        }
        const data = (0, helpers_1.writeDataRLE)(buffer, pixelData, [offset], false);
        writeUint32(writer, 1);
        writeUint32(writer, data.length + 4 + 16 + 2 + 1);
        writeUint32(writer, 8);
        writeUint32(writer, top);
        writeUint32(writer, left);
        writeUint32(writer, bottom);
        writeUint32(writer, right);
        writeUint16(writer, 8);
        writeUint8(writer, 1);
        writeBytes(writer, data);
      }
      const vlLength = writer.offset - vlOffset;
      let pattsLength = writer.offset - pattsOffset;
      while (pattsLength % 4) {
        writeZeros(writer, 1);
        pattsLength++;
      }
      writer.view.setUint32(vlOffset - 4, vlLength, false);
      writer.view.setUint32(pattsOffset - 4, pattsLength, false);
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/abr.js
var require_abr = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/abr.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readAbr = readAbr;
    var descriptor_1 = require_descriptor();
    var psdReader_1 = require_psdReader();
    var dynamicsControl = ["off", "fade", "pen pressure", "pen tilt", "stylus wheel", "initial direction", "direction", "initial rotation", "rotation"];
    var dynamicBrushShapeShapes = ["round point", "round blunt", "round curve", "round angle", "round fan", "flat point", "flat blunt", "flat curve", "flat angle", "flat fan"];
    var tipsBrushShapeShapes = ["erodible point", "erodible flat", "erodible round", "erodible square", "erodible triangle", "custom"];
    var MAX_BRUSH_SIZE = 1e4;
    var toBrushType = /* @__PURE__ */ new Map([
      ["_", "brush"],
      ["MixB", "mixer brush"],
      ["SmTl", "smudge brush"]
      // PbTl
      // ErTl
    ]);
    function parseDynamics(desc) {
      return {
        control: dynamicsControl[desc.bVTy],
        steps: desc.fStp,
        jitter: (0, descriptor_1.parsePercent)(desc.jitter),
        minimum: (0, descriptor_1.parsePercent)(desc["Mnm "])
      };
    }
    function parseBrushShape(desc) {
      switch (desc._classID) {
        case "computedBrush": {
          return {
            type: "computed",
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            roundness: (0, descriptor_1.parsePercent)(desc.Rndn),
            spacingOn: desc.Intr,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            flipX: desc.flipX,
            flipY: desc.flipY,
            hardness: (0, descriptor_1.parsePercent)(desc.Hrdn)
          };
        }
        case "sampledBrush": {
          return {
            type: "sampled",
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            roundness: (0, descriptor_1.parsePercent)(desc.Rndn),
            spacingOn: desc.Intr,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            flipX: desc.flipX,
            flipY: desc.flipY,
            name: desc["Nm  "],
            sampledData: desc.sampledData
          };
        }
        case "dBrush":
          return {
            type: "dynamic",
            shape: dynamicBrushShapeShapes[desc["Shp "]],
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            density: (0, descriptor_1.parsePercent)(desc.Dnst),
            length: (0, descriptor_1.parsePercent)(desc.Lngt),
            clumping: (0, descriptor_1.parsePercent)(desc.clumping),
            thickness: (0, descriptor_1.parsePercent)(desc.thickness),
            stiffness: (0, descriptor_1.parsePercent)(desc.stiffness),
            physics: desc.physics,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            spacingOn: desc.Intr,
            flipX: desc.flipX,
            flipY: desc.flipY
          };
        case "dTips": {
          return Object.assign(Object.assign({
            type: "tips",
            angle: (0, descriptor_1.parseAngle)(desc.Angl),
            size: (0, descriptor_1.parseUnitsToNumber)(desc.Dmtr, "Pixels"),
            shape: dynamicBrushShapeShapes[desc["Shp "]],
            physics: desc.physics,
            spacing: (0, descriptor_1.parsePercent)(desc.Spcn),
            spacingOn: desc.Intr,
            flipX: desc.flipX,
            flipY: desc.flipY,
            // tips:
            tipsType: tipsBrushShapeShapes[desc.dtipsType],
            tipsLengthRatio: (0, descriptor_1.parsePercent)(desc.dtipsLengthRatio),
            tipsHardness: (0, descriptor_1.parsePercent)(desc.dtipsHardness)
          }, desc.dtipsGridSize && desc.dtipsErodibleTipHeightMap ? {
            tipsGridSize: desc.dtipsGridSize,
            tipsErodibleTipHeightMap: parseHeightmap(desc.dtipsErodibleTipHeightMap)
          } : {}), {
            // airbrush
            tipsAirbrushCutoffAngle: desc.dtipsAirbrushCutoffAngle,
            tipsAirbrushGranularity: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushGranularity),
            tipsAirbrushStreakiness: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushStreakiness),
            tipsAirbrushSplatSize: (0, descriptor_1.parsePercent)(desc.dtipsAirbrushSplatSize),
            tipsAirbrushSplatCount: desc.dtipsAirbrushSplatCount
          });
        }
        default:
          throw new Error(`Unknown brush classId: ${desc._classID}`);
      }
    }
    function parseHeightmap(array) {
      const result = [];
      for (let i = 0; i < array.byteLength; i++) {
        result.push(array[i]);
      }
      return result;
    }
    function readSectionDescriptor(reader, end) {
      const sectionReader = (0, psdReader_1.createReader)(reader.view.buffer, reader.view.byteOffset + reader.offset, end - reader.offset);
      return (0, descriptor_1.readVersionAndDescriptor)(sectionReader, true);
    }
    function readAbr(buffer, options = {}) {
      const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      reader.logMissingFeatures = options.logMissingFeatures;
      reader.throwForMissingFeatures = options.throwForMissingFeatures;
      reader.totalMemoryLimit = "totalMemoryLimit" in options ? options.totalMemoryLimit : 2 * 1024 * 1024 * 1024;
      const skip = (e, what) => {
        if (options.throwForMissingFeatures)
          throw e;
        options.logMissingFeatures && reader.log(`Skipped ${what}: ${e.message}`);
      };
      if (reader.view.byteLength < 4)
        throw new Error("Invalid ABR file");
      const version = (0, psdReader_1.readInt16)(reader);
      const samples = [];
      const brushes = [];
      const patterns = [];
      const brushByPreset = [];
      let hierarchy;
      if (version === 1 || version === 2) {
        readLegacyBrushes(reader, version, samples, brushes, skip);
      } else if (version === 6 || version === 7 || version === 9 || version === 10) {
        const minorVersion = (0, psdReader_1.readInt16)(reader);
        if (minorVersion !== 1 && minorVersion !== 2)
          throw new Error("Unsupported ABR minor version");
        while (reader.offset + 12 <= reader.view.byteLength) {
          (0, psdReader_1.checkSignature)(reader, "8BIM");
          const type = (0, psdReader_1.readSignature)(reader);
          const size = (0, psdReader_1.readUint32)(reader);
          const end = Math.min(reader.offset + size, reader.view.byteLength);
          try {
            switch (type) {
              case "samp": {
                while (reader.offset + 4 <= end) {
                  let brushLength = (0, psdReader_1.readUint32)(reader);
                  while (brushLength & 3)
                    brushLength++;
                  const brushEnd = Math.min(reader.offset + brushLength, end);
                  try {
                    const sample = readSample(reader, brushEnd, minorVersion);
                    samples.push(sample);
                  } catch (e) {
                    skip(e, "brush sample");
                  }
                  reader.offset = brushEnd;
                }
                break;
              }
              case "desc": {
                const desc = readSectionDescriptor(reader, end);
                for (const [index, brush] of (desc.Brsh || []).entries()) {
                  try {
                    const parsed = parseBrush(brush);
                    brushes.push(parsed);
                    brushByPreset[index] = parsed;
                  } catch (e) {
                    skip(e, `brush "${brush["Nm  "]}"`);
                  }
                }
                break;
              }
              case "patt": {
                while (reader.offset + 4 <= end) {
                  const pattern = (0, psdReader_1.readPatternSafe)(reader);
                  if (pattern)
                    patterns.push(pattern);
                }
                break;
              }
              case "phry": {
                const desc = readSectionDescriptor(reader, end);
                hierarchy = desc.hierarchy;
                break;
              }
              default:
                options.logMissingFeatures && reader.log(`Unhandled brush section: ${type}`);
                break;
            }
          } catch (e) {
            skip(e, `brush section ${type}`);
          }
          reader.offset = end;
          while (reader.offset % 4)
            reader.offset++;
        }
      } else {
        throw new Error(`Unsupported ABR version (${version})`);
      }
      if (hierarchy) {
        const groups = [];
        let presetIndex = 0;
        for (const item of hierarchy) {
          if (item._classID === "Grup") {
            groups.push(item["Nm  "]);
          } else if (item._classID === "groupEnd") {
            groups.pop();
          } else if (item._classID === "preset") {
            const brush = brushByPreset[presetIndex];
            if (brush && groups.length)
              brush.group = groups.slice();
            presetIndex++;
          }
        }
      }
      return { samples, patterns, brushes };
    }
    function readSample(reader, brushEnd, minorVersion) {
      const id = (0, psdReader_1.readPascalString)(reader, 1);
      (0, psdReader_1.skipBytes)(reader, minorVersion === 1 ? 10 : 264);
      return readSampleBitmap(reader, brushEnd, id);
    }
    function readSampleBitmap(reader, brushEnd, id) {
      const y = (0, psdReader_1.readInt32)(reader);
      const x = (0, psdReader_1.readInt32)(reader);
      const h = (0, psdReader_1.readInt32)(reader) - y;
      const w = (0, psdReader_1.readInt32)(reader) - x;
      if (w <= 0 || h <= 0)
        throw new Error("Invalid bounds");
      if (w > MAX_BRUSH_SIZE || h > MAX_BRUSH_SIZE) {
        throw new Error(`Brush sample too large (${w}x${h})`);
      }
      const bithDepth = (0, psdReader_1.readInt16)(reader);
      const compression = (0, psdReader_1.readUint8)(reader);
      if (bithDepth !== 8 && bithDepth !== 16)
        throw new Error("Invalid depth");
      if (compression !== 0 && compression !== 1)
        throw new Error("Invalid compression");
      const rowSize = w * (bithDepth === 16 ? 2 : 1);
      const minDataSize = compression === 0 ? h * rowSize : h * (2 + Math.ceil(rowSize / 128) * 2);
      if (minDataSize > brushEnd - reader.offset) {
        throw new Error("Brush sample data out of bounds");
      }
      (0, psdReader_1.consumeMemory)(reader, w * h * (bithDepth === 16 ? 3 : 1));
      const alpha = new Uint8Array(w * h);
      if (bithDepth === 8) {
        if (compression === 0) {
          alpha.set((0, psdReader_1.readBytes)(reader, alpha.byteLength));
        } else if (compression === 1) {
          (0, psdReader_1.readDataRLE)(reader, { width: w, height: h, data: alpha }, w, h, bithDepth, 1, [0], false);
        } else {
          throw new Error("Invalid compression");
        }
      } else if (bithDepth === 16) {
        const data = new Uint16Array(w * h);
        if (compression === 0) {
          for (let i = 0; i < data.length; i++) {
            data[i] = (0, psdReader_1.readUint16)(reader);
          }
        } else if (compression === 1) {
          (0, psdReader_1.readDataRLE)(reader, { width: w, height: h, data }, w, h, bithDepth, 1, [0], false);
        } else {
          throw new Error("Invalid compression");
        }
        let max = 0;
        for (let i = 0; i < data.length; i++)
          max = Math.max(max, data[i]);
        const scale = max > 32768 ? 255 / 65535 : 255 / 32768;
        for (let i = 0; i < alpha.byteLength; i++) {
          alpha[i] = Math.round(data[i] * scale);
        }
      } else {
        throw new Error("Invalid depth");
      }
      return { id, bounds: { x, y, w, h }, alpha };
    }
    function readLegacyBrushes(reader, version, samples, brushes, skip) {
      const count = (0, psdReader_1.readUint16)(reader);
      for (let i = 0; i < count; i++) {
        const type = (0, psdReader_1.readUint16)(reader);
        const size = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + size;
        if (end > reader.view.byteLength) {
          skip(new Error("Brush data out of bounds"), `brush ${i + 1}`);
          break;
        }
        try {
          if (type === 1) {
            (0, psdReader_1.skipBytes)(reader, 4);
            const spacing = (0, psdReader_1.readUint16)(reader);
            const diameter = (0, psdReader_1.readUint16)(reader);
            const roundness = (0, psdReader_1.readUint16)(reader);
            const angle = (0, psdReader_1.readInt16)(reader);
            const hardness = (0, psdReader_1.readUint16)(reader);
            if (reader.offset > end)
              throw new Error("Brush data out of bounds");
            brushes.push(createLegacyBrush("", {
              type: "computed",
              size: diameter,
              angle,
              roundness: roundness / 100,
              spacingOn: spacing !== 0,
              spacing: spacing / 100,
              flipX: false,
              flipY: false,
              hardness: hardness / 100
            }));
          } else if (type === 2) {
            (0, psdReader_1.skipBytes)(reader, 4);
            const spacing = (0, psdReader_1.readUint16)(reader);
            const name = version === 2 ? (0, psdReader_1.readUnicodeString)(reader) : "";
            (0, psdReader_1.skipBytes)(reader, 1 + 8);
            const sample = readSampleBitmap(reader, end, `brush-${i + 1}`);
            samples.push(sample);
            brushes.push(createLegacyBrush(name, {
              type: "sampled",
              size: Math.max(sample.bounds.w, sample.bounds.h),
              angle: 0,
              roundness: 1,
              spacingOn: spacing !== 0,
              spacing: spacing / 100,
              flipX: false,
              flipY: false,
              name,
              sampledData: sample.id
            }));
          } else {
            throw new Error(`Unknown brush type: ${type}`);
          }
        } catch (e) {
          skip(e, `brush ${i + 1}`);
        }
        reader.offset = end;
      }
    }
    function createLegacyBrush(name, shape) {
      return { name, shape, spacing: 1, wetEdges: false, noise: false, buildUp: false, useBrushSize: true };
    }
    function parseBrush(brush) {
      var _a, _b, _c;
      const b = {
        name: brush["Nm  "],
        shape: parseBrushShape(brush.Brsh),
        spacing: (0, descriptor_1.parsePercent)(brush.Spcn),
        wetEdges: brush.Wtdg,
        noise: brush.Nose,
        buildUp: !!brush["Rpt "],
        useBrushSize: brush.useBrushSize
        // ???
      };
      if (brush.interpretation != null)
        b.interpretation = brush.interpretation;
      if (brush.protectTexture != null)
        b.protectTexture = brush.protectTexture;
      if (brush.useTipDynamics) {
        b.shapeDynamics = {
          tiltScale: (0, descriptor_1.parsePercent)(brush.tiltScale),
          sizeDynamics: parseDynamics(brush.szVr),
          angleDynamics: parseDynamics(brush.angleDynamics),
          roundnessDynamics: parseDynamics(brush.roundnessDynamics),
          flipX: brush.flipX,
          flipY: brush.flipY,
          brushProjection: brush.brushProjection,
          minimumDiameter: (0, descriptor_1.parsePercent)(brush.minimumDiameter),
          minimumRoundness: (0, descriptor_1.parsePercent)(brush.minimumRoundness)
        };
      }
      if (brush.useScatter) {
        b.scatter = {
          count: brush["Cnt "],
          bothAxes: brush.bothAxes,
          countDynamics: parseDynamics(brush.countDynamics),
          scatterDynamics: parseDynamics(brush.scatterDynamics)
        };
      }
      if (brush.useTexture && brush.Txtr) {
        b.texture = {
          id: brush.Txtr.Idnt,
          name: brush.Txtr["Nm  "],
          blendMode: descriptor_1.BlnM.decode(brush.textureBlendMode),
          depth: (0, descriptor_1.parsePercent)(brush.textureDepth),
          depthMinimum: (0, descriptor_1.parsePercent)(brush.minimumDepth),
          depthDynamics: parseDynamics(brush.textureDepthDynamics),
          scale: (0, descriptor_1.parsePercent)(brush.textureScale),
          invert: brush.InvT,
          brightness: brush.textureBrightness,
          contrast: brush.textureContrast,
          textureEachTip: !!brush.TxtC
        };
      }
      const db = brush.dualBrush;
      if (db && db.useDualBrush) {
        b.dualBrush = {
          flip: db.Flip,
          shape: parseBrushShape(db.Brsh),
          blendMode: descriptor_1.BlnM.decode(db.BlnM),
          useScatter: db.useScatter,
          spacing: (0, descriptor_1.parsePercent)(db.Spcn),
          count: db["Cnt "],
          bothAxes: db.bothAxes,
          countDynamics: parseDynamics(db.countDynamics),
          scatterDynamics: parseDynamics(db.scatterDynamics)
        };
      }
      if (brush.useColorDynamics) {
        b.colorDynamics = {
          foregroundBackground: parseDynamics(brush.clVr),
          hue: (0, descriptor_1.parsePercent)(brush["H   "]),
          saturation: (0, descriptor_1.parsePercent)(brush.Strt),
          brightness: (0, descriptor_1.parsePercent)(brush.Brgh),
          purity: (0, descriptor_1.parsePercent)(brush.purity),
          perTip: brush.colorDynamicsPerTip
        };
      }
      if (brush.usePaintDynamics) {
        b.transfer = {
          flowDynamics: parseDynamics(brush.prVr),
          opacityDynamics: parseDynamics(brush.opVr)
        };
        if (brush.wtVr)
          b.transfer.wetnessDynamics = parseDynamics(brush.wtVr);
        if (brush.mxVr)
          b.transfer.mixDynamics = parseDynamics(brush.mxVr);
      }
      if (brush.useBrushPose) {
        b.brushPose = {
          overrideAngle: brush.overridePoseAngle,
          overrideTiltX: brush.overridePoseTiltX,
          overrideTiltY: brush.overridePoseTiltY,
          overridePressure: brush.overridePosePressure,
          pressure: (0, descriptor_1.parsePercent)(brush.brushPosePressure),
          tiltX: brush.brushPoseTiltX,
          tiltY: brush.brushPoseTiltY,
          angle: brush.brushPoseAngle
        };
      }
      const to = brush.toolOptions;
      if (to) {
        b.toolOptions = {
          type: toBrushType.get(to._classID) || "brush",
          brushPreset: to.brushPreset,
          flow: (_a = to.flow) !== null && _a !== void 0 ? _a : 100,
          smooth: (_b = to.Smoo) !== null && _b !== void 0 ? _b : 0,
          mode: descriptor_1.BlnM.decode(to["Md  "] || "BlnM.Nrml"),
          // sometimes mode is missing
          opacity: (_c = to.Opct) !== null && _c !== void 0 ? _c : 100,
          smoothing: !!to.smoothing,
          smoothingValue: to.smoothingValue || 0,
          smoothingRadiusMode: !!to.smoothingRadiusMode,
          smoothingCatchup: !!to.smoothingCatchup,
          smoothingCatchupAtEnd: !!to.smoothingCatchupAtEnd,
          smoothingZoomCompensation: !!to.smoothingZoomCompensation,
          pressureSmoothing: !!to.pressureSmoothing,
          usePressureOverridesSize: !!to.usePressureOverridesSize,
          usePressureOverridesOpacity: !!to.usePressureOverridesOpacity,
          useLegacy: !!to.useLegacy
        };
        if (to.prVr)
          b.toolOptions.flowDynamics = parseDynamics(to.prVr);
        if (to.opVr)
          b.toolOptions.opacityDynamics = parseDynamics(to.opVr);
        if (to.szVr)
          b.toolOptions.sizeDynamics = parseDynamics(to.szVr);
        if ("wetness" in to)
          b.toolOptions.wetness = to.wetness;
        if ("dryness" in to)
          b.toolOptions.dryness = to.dryness;
        if ("mix" in to)
          b.toolOptions.mix = to.mix;
        if ("autoFill" in to)
          b.toolOptions.autoFill = to.autoFill;
        if ("autoClean" in to)
          b.toolOptions.autoClean = to.autoClean;
        if ("loadSolidColorOnly" in to)
          b.toolOptions.loadSolidColorOnly = to.loadSolidColorOnly;
        if ("sampleAllLayers" in to)
          b.toolOptions.sampleAllLayers = to.sampleAllLayers;
        if ("SmdF" in to)
          b.toolOptions.smudgeFingerPainting = to.SmdF;
        if ("SmdS" in to)
          b.toolOptions.smudgeSampleAllLayers = to.SmdS;
        if ("Prs " in to)
          b.toolOptions.strength = to["Prs "];
      }
      return b;
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/csh.js
var require_csh = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/csh.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readCsh = readCsh;
    var additionalInfo_1 = require_additionalInfo();
    var psdReader_1 = require_psdReader();
    function readCsh(buffer, options = {}) {
      const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      reader.totalMemoryLimit = "totalMemoryLimit" in options ? options.totalMemoryLimit : 2 * 1024 * 1024 * 1024;
      const csh = { shapes: [] };
      (0, psdReader_1.checkSignature)(reader, "cush");
      if ((0, psdReader_1.readUint32)(reader) !== 2)
        throw new Error("Invalid version");
      const count = (0, psdReader_1.readUint32)(reader);
      for (let i = 0; i < count; i++) {
        const name = (0, psdReader_1.readUnicodeString)(reader);
        while (reader.offset % 4)
          reader.offset++;
        if ((0, psdReader_1.readUint32)(reader) !== 1)
          throw new Error("Invalid shape version");
        const size = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + size;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const y1 = (0, psdReader_1.readUint32)(reader);
        const x1 = (0, psdReader_1.readUint32)(reader);
        const y2 = (0, psdReader_1.readUint32)(reader);
        const x2 = (0, psdReader_1.readUint32)(reader);
        const width = x2 - x1;
        const height = y2 - y1;
        const mask = { paths: [] };
        (0, additionalInfo_1.readVectorMask)(reader, mask, width, height, end - reader.offset);
        csh.shapes.push(Object.assign({ name, id, width, height }, mask));
        reader.offset = end;
      }
      return csh;
    }
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/ase.js
var require_ase = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/ase.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readAse = readAse;
    var psdReader_1 = require_psdReader();
    function readAse(buffer, options = {}) {
      const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      reader.totalMemoryLimit = "totalMemoryLimit" in options ? options.totalMemoryLimit : 2 * 1024 * 1024 * 1024;
      const signature = (0, psdReader_1.readSignature)(reader);
      if (signature !== "ASEF")
        throw new Error("Invalid signature");
      const versionMajor = (0, psdReader_1.readUint16)(reader);
      (0, psdReader_1.readUint16)(reader);
      if (versionMajor !== 1)
        throw new Error("Invalid version");
      const blocksCount = (0, psdReader_1.readUint32)(reader);
      const ase = { colors: [] };
      let group = ase;
      for (let i = 0; i < blocksCount && reader.offset + 6 <= reader.view.byteLength; i++) {
        const type = (0, psdReader_1.readUint16)(reader);
        const length = (0, psdReader_1.readUint32)(reader);
        const end = Math.min(reader.offset + length, reader.view.byteLength);
        const block = (0, psdReader_1.createReader)(reader.view.buffer, reader.view.byteOffset + reader.offset, end - reader.offset);
        block.totalMemoryLimit = reader.totalMemoryLimit;
        try {
          switch (type) {
            case 1: {
              const color = readAseColor(block);
              if (color) {
                group.colors.push(color);
              } else {
                if (options.throwForMissingFeatures)
                  throw new Error("Unsupported color mode");
                options.logMissingFeatures && reader.log("Skipped color with unsupported color mode");
              }
              break;
            }
            case 49153: {
              const nameLength = (0, psdReader_1.readUint16)(block);
              const name = (0, psdReader_1.readUnicodeStringWithLength)(block, nameLength);
              ase.colors.push(group = { name, colors: [] });
              break;
            }
            case 49154:
              group = ase;
              break;
            default:
              if (options.throwForMissingFeatures)
                throw new Error(`Invalid block type: ${type}`);
              options.logMissingFeatures && reader.log(`Skipped unknown block type: ${type}`);
          }
        } catch (e) {
          if (options.throwForMissingFeatures)
            throw e;
          options.logMissingFeatures && reader.log(`Skipped invalid block: ${e.message}`);
        }
        reader.totalMemoryLimit = block.totalMemoryLimit;
        reader.offset = end;
      }
      return ase;
    }
    function readAseColor(reader) {
      const nameLength = (0, psdReader_1.readUint16)(reader);
      const name = (0, psdReader_1.readUnicodeStringWithLength)(reader, nameLength);
      const colorMode = (0, psdReader_1.readSignature)(reader);
      const value = () => {
        const v = (0, psdReader_1.readFloat32)(reader);
        return isFinite(v) ? v : 0;
      };
      const colorType = () => {
        const index = reader.offset + 2 <= reader.view.byteLength ? (0, psdReader_1.readUint16)(reader) : 2;
        return colorTypes[index] || "normal";
      };
      switch (colorMode) {
        case "RGB ":
          return { name, color: { r: value(), g: value(), b: value(), type: colorType() } };
        case "CMYK":
          return { name, color: { c: value(), m: value(), y: value(), k: value(), type: colorType() } };
        case "Gray":
          return { name, color: { k: value(), type: colorType() } };
        case "LAB ":
          return { name, color: { l: value(), a: value(), b: value(), type: colorType() } };
        default:
          return void 0;
      }
    }
    var colorTypes = ["global", "spot", "normal"];
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/psd.js
var require_psd = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/psd.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Compression = exports.ChannelID = exports.LayerCompCapturedInfo = exports.SectionDividerType = exports.ColorMode = void 0;
    var ColorMode;
    (function(ColorMode2) {
      ColorMode2[ColorMode2["Bitmap"] = 0] = "Bitmap";
      ColorMode2[ColorMode2["Grayscale"] = 1] = "Grayscale";
      ColorMode2[ColorMode2["Indexed"] = 2] = "Indexed";
      ColorMode2[ColorMode2["RGB"] = 3] = "RGB";
      ColorMode2[ColorMode2["CMYK"] = 4] = "CMYK";
      ColorMode2[ColorMode2["Multichannel"] = 7] = "Multichannel";
      ColorMode2[ColorMode2["Duotone"] = 8] = "Duotone";
      ColorMode2[ColorMode2["Lab"] = 9] = "Lab";
    })(ColorMode || (exports.ColorMode = ColorMode = {}));
    var SectionDividerType;
    (function(SectionDividerType2) {
      SectionDividerType2[SectionDividerType2["Other"] = 0] = "Other";
      SectionDividerType2[SectionDividerType2["OpenFolder"] = 1] = "OpenFolder";
      SectionDividerType2[SectionDividerType2["ClosedFolder"] = 2] = "ClosedFolder";
      SectionDividerType2[SectionDividerType2["BoundingSectionDivider"] = 3] = "BoundingSectionDivider";
    })(SectionDividerType || (exports.SectionDividerType = SectionDividerType = {}));
    var LayerCompCapturedInfo;
    (function(LayerCompCapturedInfo2) {
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["None"] = 0] = "None";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Visibility"] = 1] = "Visibility";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Position"] = 2] = "Position";
      LayerCompCapturedInfo2[LayerCompCapturedInfo2["Appearance"] = 4] = "Appearance";
    })(LayerCompCapturedInfo || (exports.LayerCompCapturedInfo = LayerCompCapturedInfo = {}));
    var ChannelID;
    (function(ChannelID2) {
      ChannelID2[ChannelID2["Color0"] = 0] = "Color0";
      ChannelID2[ChannelID2["Color1"] = 1] = "Color1";
      ChannelID2[ChannelID2["Color2"] = 2] = "Color2";
      ChannelID2[ChannelID2["Color3"] = 3] = "Color3";
      ChannelID2[ChannelID2["Transparency"] = -1] = "Transparency";
      ChannelID2[ChannelID2["UserMask"] = -2] = "UserMask";
      ChannelID2[ChannelID2["RealUserMask"] = -3] = "RealUserMask";
    })(ChannelID || (exports.ChannelID = ChannelID = {}));
    var Compression;
    (function(Compression2) {
      Compression2[Compression2["RawData"] = 0] = "RawData";
      Compression2[Compression2["RleCompressed"] = 1] = "RleCompressed";
      Compression2[Compression2["ZipWithoutPrediction"] = 2] = "ZipWithoutPrediction";
      Compression2[Compression2["ZipWithPrediction"] = 3] = "ZipWithPrediction";
    })(Compression || (exports.Compression = Compression = {}));
  }
});

// github-r14-stage/export-deps/node_modules/ag-psd/dist/index.js
var require_dist = __commonJS({
  "github-r14-stage/export-deps/node_modules/ag-psd/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getFilterEffectsMaskExtraCanvas = exports.getFilterEffectsMaskCanvas = exports.getFilterEffectsMaskExtraImageData = exports.getFilterEffectsMaskImageData = exports.getCompositeCanvas = exports.getCompositeImageData = exports.getLayerRealMaskCanvas = exports.getLayerMaskCanvas = exports.getLayerCanvas = exports.getLayerRealMaskImageData = exports.getLayerMaskImageData = exports.getLayerImageData = exports.decodeLayerPixels = exports.byteArrayToBase64 = exports.initializeCanvas = void 0;
    exports.readPsd = readPsd;
    exports.writePsd = writePsd2;
    exports.writePsdUint8Array = writePsdUint8Array;
    exports.writePsdBuffer = writePsdBuffer;
    var psdWriter_1 = require_psdWriter();
    var psdReader_1 = require_psdReader();
    Object.defineProperty(exports, "decodeLayerPixels", { enumerable: true, get: function() {
      return psdReader_1.decodeLayerPixels;
    } });
    Object.defineProperty(exports, "getLayerImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerImageData;
    } });
    Object.defineProperty(exports, "getLayerMaskImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerMaskImageData;
    } });
    Object.defineProperty(exports, "getLayerRealMaskImageData", { enumerable: true, get: function() {
      return psdReader_1.getLayerRealMaskImageData;
    } });
    Object.defineProperty(exports, "getLayerCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerCanvas;
    } });
    Object.defineProperty(exports, "getLayerMaskCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerMaskCanvas;
    } });
    Object.defineProperty(exports, "getLayerRealMaskCanvas", { enumerable: true, get: function() {
      return psdReader_1.getLayerRealMaskCanvas;
    } });
    Object.defineProperty(exports, "getCompositeImageData", { enumerable: true, get: function() {
      return psdReader_1.getCompositeImageData;
    } });
    Object.defineProperty(exports, "getCompositeCanvas", { enumerable: true, get: function() {
      return psdReader_1.getCompositeCanvas;
    } });
    Object.defineProperty(exports, "getFilterEffectsMaskImageData", { enumerable: true, get: function() {
      return psdReader_1.getFilterEffectsMaskImageData;
    } });
    Object.defineProperty(exports, "getFilterEffectsMaskExtraImageData", { enumerable: true, get: function() {
      return psdReader_1.getFilterEffectsMaskExtraImageData;
    } });
    Object.defineProperty(exports, "getFilterEffectsMaskCanvas", { enumerable: true, get: function() {
      return psdReader_1.getFilterEffectsMaskCanvas;
    } });
    Object.defineProperty(exports, "getFilterEffectsMaskExtraCanvas", { enumerable: true, get: function() {
      return psdReader_1.getFilterEffectsMaskExtraCanvas;
    } });
    var base64_js_1 = require_base64_js();
    __exportStar(require_abr(), exports);
    __exportStar(require_csh(), exports);
    __exportStar(require_ase(), exports);
    var helpers_1 = require_helpers();
    Object.defineProperty(exports, "initializeCanvas", { enumerable: true, get: function() {
      return helpers_1.initializeCanvas;
    } });
    __exportStar(require_psd(), exports);
    exports.byteArrayToBase64 = base64_js_1.fromByteArray;
    function readPsd(buffer, options) {
      const reader = "buffer" in buffer ? (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength) : (0, psdReader_1.createReader)(buffer);
      return (0, psdReader_1.readPsd)(reader, options);
    }
    function writePsd2(psd, options) {
      const writer = (0, psdWriter_1.createWriter)();
      (0, psdWriter_1.writePsd)(writer, psd, options);
      return (0, psdWriter_1.getWriterBuffer)(writer);
    }
    function writePsdUint8Array(psd, options) {
      const writer = (0, psdWriter_1.createWriter)();
      (0, psdWriter_1.writePsd)(writer, psd, options);
      return (0, psdWriter_1.getWriterBufferNoCopy)(writer);
    }
    function writePsdBuffer(psd, options) {
      if (typeof Buffer === "undefined") {
        throw new Error("Buffer not supported on this platform");
      }
      return Buffer.from(writePsdUint8Array(psd, options));
    }
  }
});

// github-r14-stage/psd-entry.mjs
var import_dist = __toESM(require_dist(), 1);
var export_writePsd = import_dist.writePsd;
export {
  export_writePsd as writePsd
};
